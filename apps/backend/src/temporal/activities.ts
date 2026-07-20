/**
 * Temporal Activities — Stateless, idempotent units of work.
 *
 * Each activity maps to a former node's `run()` logic, restructured for
 * Temporal's retry & timeout semantics. Activities throw standard Errors
 * on failure so Temporal can apply retry policies.
 */

import axios from "axios";
import nodemailer from "nodemailer";
import Credential from "../models/credential.model.js";
import Automation from "../models/automation.model.js";
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
  flushWorkflowPayloads,
} from "./payloadStore.js";
import { executeInPool } from "../infra/isolate.pool.js";
import {
  storeBinary,
  retrieveBinary,
  isBinaryContentType,
  cleanupWorkflowBinaries,
  type BinaryMetadata,
} from "../infra/binary.store.js";
import { emitNodeStatus } from "../infra/socket.server.js";

// ── Constants ───────────────────────────────────────────────────────────────────

const MAX_RESPONSE_BYTES = 25 * 1024 * 1024; // 25 MB — binary files stream to object storage, not Temporal state
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
  responseType?: "auto" | "json" | "binary";
  workflowId?: string;
  nodeId?: string;
}

interface HttpRequestOutput {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  binary?: boolean;
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
    responseType = "auto",
    workflowId = "unknown",
    nodeId = "http_request",
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
  const forceBinary = responseType === "binary";
  const forceJson = responseType === "json";

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
      // Request as arraybuffer so we can detect binary content
      responseType: forceJson ? "json" : "arraybuffer",
    });

    const contentType = (response.headers["content-type"] as string) || "";
    const shouldStoreBinary =
      forceBinary || (!forceJson && isBinaryContentType(contentType));

    if (shouldStoreBinary && Buffer.isBuffer(response.data)) {
      // Stream binary to object storage — return metadata pointer only
      const binaryMeta = await storeBinary(
        workflowId,
        nodeId,
        response.data,
        contentType.split(";")[0].trim(),
        response.headers as Record<string, string>,
      );

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        data: binaryMeta,
        binary: true,
      };
    }

    // Non-binary: parse arraybuffer back to text/JSON
    let data: unknown = response.data;
    if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
      const text = Buffer.from(data).toString("utf-8");
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
      data,
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
// Hard-isolated V8 sandbox via pooled isolated-vm contexts.
//   - 64 MB memory ceiling per isolate (OOM → isolate killed, worker survives)
//   - 500 ms wall-clock timeout (infinite loops → killed)
//   - No require, process, fs, net, or host global access
//   - Warm pool of 5–10 isolates eliminates cold-start latency (~50ms saved/call)
//   - Variables injected via ivm.ExternalCopy (no JSON bridge escape hatch)

export async function executeSecureCodeActivity(
  input: SecureCodeInput,
): Promise<SecureCodeOutput> {
  const { code, variables } = input;

  if (!code || typeof code !== "string") {
    throw new Error("Code Node: 'code' string is required.");
  }

  const result = await executeInPool(code, variables ?? {});
  return { result };
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

/**
 * Flush workflow payloads from Redis → MongoDB for long-term storage.
 * Called as the final activity in a workflow execution. This ensures
 * payloads are persisted to MongoDB before the Redis TTL expires.
 */
export async function flushPayloadsActivity(
  input: { workflowId: string },
): Promise<{ flushed: number }> {
  const flushed = await flushWorkflowPayloads(input.workflowId);
  return { flushed };
}

// ── Binary Store Activities ────────────────────────────────────────────────────
// Store/retrieve/cleanup binary files (images, PDFs, etc.) in S3 or local disk.
// Binary metadata pointers flow through Temporal state; actual bytes never do.

export async function retrieveBinaryActivity(
  input: { storageKey: string; storedAt: string },
): Promise<{ buffer: string }> {
  const buf = await retrieveBinary(input.storageKey, input.storedAt);
  // Return as base64 for Temporal serialization (only used for download endpoints)
  return { buffer: buf.toString("base64") };
}

export async function cleanupWorkflowBinariesActivity(
  input: { workflowId: string },
): Promise<{ deleted: number }> {
  const deleted = await cleanupWorkflowBinaries(input.workflowId);
  return { deleted };
}

// ── Node Status Socket Activity ────────────────────────────────────────────────
// Fires granular per-node lifecycle events over Socket.IO so the frontend canvas
// can animate edges and update node badges in real-time without polling.
// Best-effort: failures are swallowed — the workflow never blocks on a missed
// socket event.

interface NodeStatusInput {
  automationId: string;
  nodeId: string;
  nodeType: string;
  status: "started" | "completed" | "failed";
  durationMs?: number;
  error?: string;
}

export async function emitNodeStatusActivity(
  input: NodeStatusInput,
): Promise<void> {
  emitNodeStatus(input.automationId, {
    automationId: input.automationId,
    nodeId: input.nodeId,
    nodeType: input.nodeType,
    status: input.status,
    durationMs: input.durationMs,
    error: input.error,
    ts: Date.now(),
  });
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
// ── Sub-Workflow: Load Target Automation ────────────────────────────────────────

interface LoadSubWorkflowInput {
  targetAutomationId: string;
  workspaceId: string;
  parentChain?: string[];
}

interface SubWorkflowDefinition {
  automationId: string;
  name: string;
  trigger: string;
  active: boolean;
  workspaceId: string;
  nodes: Array<{
    id: string;
    type: string;
    data: Record<string, unknown>;
    position: { x: number; y: number };
    description: string;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle: string | null;
    targetHandle: string | null;
    condition: unknown;
    type: string;
    description: string;
  }>;
  entryNodeId: string;
  settings: Record<string, unknown>;
  description: string;
}

/**
 * Load a target automation from MongoDB and build a WorkflowDefinition
 * that can be passed to executeChild() in the workflow layer.
 *
 * Security: Validates that the target automation belongs to the same
 * workspace as the parent, preventing cross-workspace data leakage.
 */
export async function loadSubWorkflowDefinitionActivity(
  input: LoadSubWorkflowInput,
): Promise<SubWorkflowDefinition> {
  const { targetAutomationId, workspaceId, parentChain = [] } = input;

  // Cycle detection: prevent A → B → A infinite recursion
  if (parentChain.includes(targetAutomationId)) {
    throw new Error(
      `Sub-Workflow cycle detected: "${targetAutomationId}" is already in the call chain ` +
      `[${parentChain.join(" → ")} → ${targetAutomationId}]. ` +
      `Sub-workflows cannot call themselves or their ancestors.`,
    );
  }

  const automation = await (Automation as any).findById(targetAutomationId).lean();

  if (!automation) {
    throw new Error(
      `Sub-Workflow: Target automation "${targetAutomationId}" not found.`,
    );
  }

  if (!automation.active) {
    throw new Error(
      `Sub-Workflow: Target automation "${automation.name}" is inactive.`,
    );
  }

  // Workspace isolation: child must belong to the same workspace as parent
  if (automation.workspaceId !== workspaceId) {
    throw new Error(
      `Sub-Workflow: Target automation belongs to a different workspace. ` +
        `Cross-workspace sub-workflows are not allowed.`,
    );
  }

  // Build the normalized definition (same shape as execution.service.js)
  return {
    automationId: automation._id.toString(),
    name: automation.name,
    trigger: automation.trigger,
    active: automation.active,
    workspaceId,
    nodes: (automation.nodes ?? []).map((n: any) => ({
      id: n.id,
      type: n.type,
      data: n.data ?? n.config ?? {},
      position: n.position ?? { x: 0, y: 0 },
      description: n.description ?? "",
    })),
    edges: (automation.edges ?? []).map((e: any) => {
      const isErrorPath =
        e.sourceHandle === "error" ||
        e.sourceHandle === "false" ||
        e.type === "onFailure";
      return {
        id: e.id ?? `${e.source ?? e.from}-${e.target ?? e.to}`,
        source: e.source ?? e.from,
        target: e.target ?? e.to,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
        condition: e.condition ?? "always",
        type: isErrorPath ? "onFailure" : "onSuccess",
        description: e.description ?? "",
      };
    }),
    entryNodeId: automation.entryNodeId ?? "",
    settings: automation.settings ?? { maxParallel: 10 },
    description: automation.description ?? "",
  };
}

// ── AI Agent Micro-Activities ──────────────────────────────────────────────────

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
