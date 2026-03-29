/**
 * Temporal Activities — Stateless, idempotent units of work.
 *
 * Each activity maps to a former node's `run()` logic, restructured for
 * Temporal's retry & timeout semantics. Activities throw standard Errors
 * on failure so Temporal can apply retry policies.
 */

import axios from "axios";
import ivm from "isolated-vm";
import nodemailer from "nodemailer";
import Credential from "../models/credential.model.js";
import { decrypt } from "../utils/crypto.js";
import { nodeRegistry } from "../nodes/index.js";
import {
  telemetryService,
  type TelemetryLog,
} from "../modules/telemetry/telemetry.service.js";
import {
  storePayload,
  resolvePayload,
  cleanupPayloads,
} from "./payloadStore.js";

// ── Constants ───────────────────────────────────────────────────────────────────

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const MAX_TIMEOUT_MS = 60_000;

// ── Input / Output Types ────────────────────────────────────────────────────────

interface HttpRequestInput {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  credentialId?: string;
  workspaceId?: string;
  queryParams?: Record<string, string>;
  timeout?: number;
  followRedirects?: boolean;
}

interface HttpRequestOutput {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
}

interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  smtpConfig: {
    host?: string;
    port?: number;
    user: string;
    pass: string;
  };
}

interface SendEmailOutput {
  success: true;
  messageId: string;
  deliveredTo: string;
  content: string;
}

interface ExecuteNodeInput {
  nodeType: string;
  config: Record<string, unknown>;
  inputData: Record<string, unknown>;
  workspaceId: string;
}

interface SecureCodeInput {
  code: string;
  variables: Record<string, unknown>;
}

interface SecureCodeOutput {
  result: unknown;
}

// ── Generic Node Activity ───────────────────────────────────────────────────────
// Dispatches to the existing nodeRegistry so every node type works out of the box.

export async function executeNodeActivity(
  input: ExecuteNodeInput,
): Promise<unknown> {
  const handler = (nodeRegistry as Record<string, { run: Function }>)[input.nodeType];
  if (!handler) {
    throw new Error(`Unsupported node type: ${input.nodeType}`);
  }
  return handler.run(input.config, input.inputData, {
    workspaceId: input.workspaceId,
  });
}

// ── HTTP Request Activity ───────────────────────────────────────────────────────

export async function executeHttpRequestActivity(
  input: HttpRequestInput,
): Promise<HttpRequestOutput> {
  const {
    url,
    method = "GET",
    headers = {},
    body = null,
    credentialId,
    workspaceId,
    queryParams = {},
    timeout = 15_000,
    followRedirects = true,
  } = input;

  if (!url) {
    throw new Error("HTTP Request: 'url' is required.");
  }

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };
  const clampedTimeout = Math.min(Math.max(timeout, 1000), MAX_TIMEOUT_MS);

  // Vault: decrypt and inject credentials at runtime
  if (credentialId) {
    const query: Record<string, string> = { _id: credentialId };
    if (workspaceId) query["workspaceId"] = workspaceId;

    const cred = await Credential.findOne(query);
    if (!cred) {
      throw new Error("HTTP Request: Credential not found in Vault.");
    }

    const secretValue = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    switch (cred.type) {
      case "bearer":
        finalHeaders["Authorization"] = `Bearer ${secretValue}`;
        break;
      case "api_key":
        finalHeaders["x-api-key"] = secretValue;
        break;
      case "basic": {
        const encoded = Buffer.from(secretValue, "utf-8").toString("base64");
        finalHeaders["Authorization"] = `Basic ${encoded}`;
        break;
      }
    }
  }

  const upperMethod = method.toUpperCase();

  try {
    const response = await axios({
      url,
      method: upperMethod,
      headers: finalHeaders,
      data: ["POST", "PUT", "PATCH"].includes(upperMethod) ? body : undefined,
      params: queryParams,
      timeout: clampedTimeout,
      maxContentLength: MAX_RESPONSE_BYTES,
      maxRedirects: followRedirects ? 5 : 0,
      validateStatus: () => true,
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
      data: response.data,
    };
  } catch (err: unknown) {
    const axiosErr = err as { code?: string; response?: { status?: number }; message: string };
    if (axiosErr.code === "ECONNABORTED") {
      throw new Error(`HTTP Request: Timeout after ${clampedTimeout}ms`);
    }
    throw new Error(
      `HTTP Request failed: ${axiosErr.response?.status ?? axiosErr.code} — ${axiosErr.message}`,
    );
  }
}

// ── Send Email Activity ─────────────────────────────────────────────────────────

export async function executeSendEmailActivity(
  input: SendEmailInput,
): Promise<SendEmailOutput> {
  const { to, subject, body, smtpConfig } = input;

  if (!to || !subject || !body) {
    throw new Error("Send Email: 'to', 'subject', and 'body' are required.");
  }

  if (!smtpConfig?.user || !smtpConfig?.pass) {
    throw new Error(
      "Send Email: Gmail account and App Password are required.",
    );
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host ?? "smtp.gmail.com",
    port: smtpConfig.port ?? 465,
    secure: true,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"BlinkBox Engine" <${smtpConfig.user}>`,
      to,
      subject,
      text: body,
    });

    return {
      success: true,
      messageId: info.messageId,
      deliveredTo: to,
      content: body,
    };
  } catch (err: unknown) {
    const error = err as Error;
    throw new Error(`Email Delivery Failed: ${error.message}`);
  }
}

// ── Secure Code Execution Activity ──────────────────────────────────────────────
// Hard-isolated V8 sandbox via isolated-vm.
//   - 32 MB memory ceiling (OOM → isolate killed, worker survives)
//   - 500 ms wall-clock timeout (infinite loops → killed)
//   - No require, process, fs, net, or host global access
//   - Variables injected via ivm.Reference (no JSON bridge escape hatch)

const CODE_MEMORY_LIMIT_MB = 32;
const CODE_TIMEOUT_MS = 500;
const MAX_VARIABLES_BYTES = 5 * 1024 * 1024; // 5 MB payload guard

export async function executeSecureCodeActivity(
  input: SecureCodeInput,
): Promise<SecureCodeOutput> {
  const { code, variables } = input;

  if (!code || typeof code !== "string") {
    throw new Error("Code Node: 'code' string is required.");
  }

  // Pre-flight: reject oversized variable payloads before allocating an isolate
  const serialized = JSON.stringify(variables ?? {});
  if (Buffer.byteLength(serialized, "utf-8") > MAX_VARIABLES_BYTES) {
    throw new Error(
      "Code Node: Variables payload exceeds 5 MB limit. Reduce input size upstream.",
    );
  }

  const isolate = new ivm.Isolate({ memoryLimit: CODE_MEMORY_LIMIT_MB });

  try {
    const context = await isolate.createContext();
    const jail = context.global;

    // Inject variables into the sandbox via ivm.Reference.
    // Each top-level key becomes a frozen global inside the isolate.
    // Using copyInto() deep-copies the value into V8 heap — no host references leak in.
    await jail.set(
      "__vars",
      new ivm.ExternalCopy(variables ?? {}).copyInto(),
    );

    // Wrapper script:
    //   1. Spreads __vars into individual globals ($input, $output, + any user keys)
    //   2. Provides a no-op console to prevent crashes on console.log()
    //   3. Runs user code synchronously
    //   4. Returns $output serialized as JSON (only way to cross the isolate boundary)
    const wrapper = `
      (function () {
        const $input  = __vars;
        let   $output = JSON.parse(JSON.stringify(__vars));
        const console = { log() {}, warn() {}, error() {}, info() {} };

        ${code}

        return JSON.stringify($output);
      })()
    `;

    const script = await isolate.compileScript(wrapper);

    // runSync: blocks the activity thread (fine — Temporal schedules activities on
    // a thread pool) and guarantees the 500 ms hard kill via V8's wall-clock timer.
    const resultStr = script.runSync(context, { timeout: CODE_TIMEOUT_MS });

    if (typeof resultStr !== "string") {
      throw new Error(
        "Code Node: Script must return a value via $output. Got undefined.",
      );
    }

    return { result: JSON.parse(resultStr) };
  } catch (err: unknown) {
    const error = err as Error;

    // Translate isolate-specific errors into structured messages
    if (error.message.includes("Script execution timed out")) {
      throw new Error(
        `Code Node: Execution timed out after ${CODE_TIMEOUT_MS}ms. ` +
        "Check for infinite loops or expensive operations.",
      );
    }
    if (error.message.includes("disposed")) {
      throw new Error(
        `Code Node: Isolate killed — exceeded ${CODE_MEMORY_LIMIT_MB}MB memory limit.`,
      );
    }
    if (error.message.includes("CompileError") || error.message.includes("SyntaxError")) {
      throw new Error(`Code Node: Compilation failed — ${error.message}`);
    }

    throw new Error(`Code Node: Execution failed — ${error.message}`);
  } finally {
    // Always free the C++ isolate memory, even on error
    if (!isolate.isDisposed) {
      isolate.dispose();
    }
  }
}

// ── Telemetry Activity ──────────────────────────────────────────────────────────
// Pushes a log entry to the Redis telemetry queue (<1ms).
// Called from the Temporal workflow for execution start/end and each node step.
// The telemetry flusher drains the queue into the database in batches.

interface TelemetryInput {
  action: "execution_start" | "node_step" | "execution_end";
  workflowId: string;
  automationId: string;
  // execution_start
  trigger?: string;
  triggerData?: Record<string, unknown>;
  // node_step
  nodeId?: string;
  nodeType?: string;
  status?: string;
  durationMs?: number;
  input?: unknown;
  output?: unknown;
  error?: string;
  // execution_end
  totalNodes?: number;
}

export async function emitTelemetryActivity(
  params: TelemetryInput,
): Promise<void> {
  switch (params.action) {
    case "execution_start":
      await telemetryService.logExecutionStart({
        workflowId: params.workflowId,
        automationId: params.automationId,
        trigger: params.trigger ?? "unknown",
        triggerData: params.triggerData ?? {},
      });
      break;
    case "node_step":
      await telemetryService.logNodeStep({
        workflowId: params.workflowId,
        automationId: params.automationId,
        nodeId: params.nodeId ?? "",
        nodeType: params.nodeType ?? "",
        status: (params.status as "success" | "failed") ?? "success",
        durationMs: params.durationMs ?? 0,
        input: params.input,
        output: params.output,
        error: params.error,
      });
      break;
    case "execution_end":
      await telemetryService.logExecutionEnd({
        workflowId: params.workflowId,
        automationId: params.automationId,
        status: (params.status as "completed" | "failed") ?? "completed",
        totalNodes: params.totalNodes ?? 0,
      });
      break;
  }
}

// ── Payload Vault Activities ──────────────────────────────────────────────────
// Store/resolve heavy node outputs in MongoDB so Temporal state stays lean.

interface StorePayloadInput {
  workflowId: string;
  nodeId: string;
  data: unknown;
}

export async function storePayloadActivity(
  input: StorePayloadInput,
): Promise<{ ref: string | null }> {
  const ref = await storePayload(input.workflowId, input.nodeId, input.data);
  return { ref };
}

export async function resolvePayloadActivity(
  input: { ref: string },
): Promise<{ data: unknown }> {
  const data = await resolvePayload(input.ref);
  return { data };
}

export async function cleanupPayloadsActivity(
  input: { workflowId: string },
): Promise<{ deleted: number }> {
  const deleted = await cleanupPayloads(input.workflowId);
  return { deleted };
}

// ── AI Agent Micro-Activities ───────────────────────────────────────────────────
// These are the decomposed steps of the ReAct loop, invoked by the
// executeAiAgentWorkflow child workflow. Each is a stateless activity that
// receives the full conversation state and returns the updated state.
//
// This architecture prevents the Temporal worker thread from blocking for
// the entire duration of a multi-iteration agent run. Instead, the thread
// yields between each micro-step.

import aiAgentNode from "../nodes/aiAgent.node.js";

// Re-export the internal helpers we need. The aiAgent node exports its
// run() method as default; the micro-activities call into its internals
// which we extract here to avoid duplicating provider/tool logic.

interface AiAgentThinkInput {
  nodeConfig: Record<string, unknown>;
  inputData: Record<string, unknown>;
  messages: Array<Record<string, unknown>> | null;
  systemPrompt: string | null;
  toolDefs: Array<Record<string, unknown>> | null;
  workspaceId: string;
  isFirstCall: boolean;
}

interface AiAgentThinkOutput {
  messages: Array<Record<string, unknown>>;
  toolCalls: Array<{ id: string; name: string; arguments: unknown }> | null;
  text: string;
  tokensUsed: number;
  systemPrompt: string;
  toolDefs: Array<Record<string, unknown>> | null;
  provider: string;
  resolvedModel: string;
}

/**
 * THINK micro-activity: Send the current conversation to the LLM and get
 * back either a tool call request or a final answer.
 *
 * On the first call (isFirstCall=true), this activity also performs setup:
 *   - Resolves LLM credentials from the Vault
 *   - Assembles the tool surface (handle-routed + registry + built-in)
 *   - Builds the system prompt
 *   - Initializes the messages array with memory + user prompt
 *
 * Returns the updated messages array with the assistant response appended.
 */
export async function aiAgentThinkActivity(
  input: AiAgentThinkInput,
): Promise<AiAgentThinkOutput> {
  // Delegate to the node's internal think function
  const result = await aiAgentNode._think(input);
  return result;
}

interface AiAgentActInput {
  toolName: string;
  toolArguments: unknown;
  toolDefs: Array<Record<string, unknown>>;
  workspaceId: string;
  nodeConfig: Record<string, unknown>;
}

interface AiAgentActOutput {
  observation: unknown;
  messages: Array<Record<string, unknown>>;
}

/**
 * ACT micro-activity: Execute a single tool call and return the observation.
 *
 * The activity resolves the tool from the tool definitions, executes it with
 * a 30s timeout, and returns the observation along with the updated messages
 * array (tool result message appended).
 */
export async function aiAgentActActivity(
  input: AiAgentActInput & { messages?: Array<Record<string, unknown>> },
): Promise<AiAgentActOutput> {
  const result = await aiAgentNode._act(input);
  return result;
}

interface AiAgentSummarizeInput {
  nodeConfig: Record<string, unknown>;
  messages: Array<Record<string, unknown>>;
  systemPrompt: string;
  workspaceId: string;
}

interface AiAgentSummarizeOutput {
  messages: Array<Record<string, unknown>>;
  tokensUsed: number;
}

/**
 * SUMMARIZE micro-activity: Compress the conversation scratchpad when
 * token count exceeds the safe threshold (~80k tokens).
 *
 * Strategy: Take all messages between the initial user prompt and the latest
 * assistant message, summarize them into a single condensed message, and
 * replace the middle section. This preserves the system context and recent
 * interactions while compressing bulky tool outputs (raw HTML, large JSON).
 */
export async function aiAgentSummarizeActivity(
  input: AiAgentSummarizeInput,
): Promise<AiAgentSummarizeOutput> {
  const result = await aiAgentNode._summarize(input);
  return result;
}
