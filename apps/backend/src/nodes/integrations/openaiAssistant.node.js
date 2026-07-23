/**
 * OPENAI ASSISTANTS NODE
 * Operations: createThread, addMessageAndRun, listMessages, deleteThread
 * Uses Assistants API v2.
 */
import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://api.openai.com/v1";
const BETA_HEADER = "assistants=v2";

async function getApiKey(credentialId, workspaceId) {
  const __accessToken = await getOAuthToken(credentialId, workspaceId, "OpenAI");
  return __accessToken;
}

function headers(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "OpenAI-Beta": BETA_HEADER,
  };
}

function handleError(err) {
  if (err.message?.startsWith("OpenAI Assistants")) throw err;
  const status = err.response?.status;
  const detail = err.response?.data?.error?.message || err.message;
  if (status === 401) throw new Error("OpenAI Assistants: Invalid API key.");
  if (status === 403) throw new Error(`OpenAI Assistants: Access denied — ${detail}`);
  if (status === 404) throw new Error("OpenAI Assistants: Thread or assistant not found.");
  if (status === 422) throw new Error(`OpenAI Assistants: Unprocessable request — ${detail}`);
  if (status === 429) throw new Error("OpenAI Assistants: Rate limit exceeded.");
  if (status >= 500) throw new Error(`OpenAI Assistants: Server error (${status}) — ${detail}`);
  throw new Error(`OpenAI Assistants: ${status ?? "Error"} — ${detail}`);
}

async function waitForRun(threadId, runId, apiKey, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await axios.get(`${BASE}/threads/${encodeURIComponent(threadId)}/runs/${encodeURIComponent(runId)}`, { headers: headers(apiKey), timeout: 120000 });
    const status = res.data.status;
    if (status === "completed") return res.data;
    if (["failed", "cancelled", "expired"].includes(status)) {
      const reason = res.data.last_error?.message || status;
      throw new Error(`OpenAI Assistants: Run ${status} — ${reason}`);
    }
    if (status === "requires_action") {
      throw new Error("OpenAI Assistants: Run requires tool action — use an AI Agent node for tool-use workflows.");
    }
  }
  throw new Error("OpenAI Assistants: Run timed out after 60 seconds.");
}

async function opCreateThread(config, apiKey) {
  const res = await axios.post(`${BASE}/threads`, {}, { headers: headers(apiKey), timeout: 120000 });
  return { threadId: res.data.id, createdAt: new Date().toISOString() };
}

async function opAddMessageAndRun(config, apiKey) {
  if (!config.assistantId) return { success: false, error: "OpenAI Assistants: 'assistantId' is required.", skipped: true };
  if (!config.message) return { success: false, error: "OpenAI Assistants: 'message' is required.", skipped: true };

  let threadId = config.threadId?.trim();

  // Auto-create thread if blank
  if (!threadId) {
    const t = await axios.post(`${BASE}/threads`, {}, { headers: headers(apiKey), timeout: 120000 });
    threadId = t.data.id;
  }

  // Add user message
  await axios.post(
    `${BASE}/threads/${encodeURIComponent(threadId)}/messages`,
    { role: "user", content: config.message },
    { headers: headers(apiKey), timeout: 120000 },
  );

  // Start run
  const runBody = { assistant_id: config.assistantId };
  if (config.instructions) runBody.instructions = config.instructions;

  const tools = [];
  if (config.enableFileSearch) tools.push({ type: "file_search" });
  if (config.enableCodeInterpreter) tools.push({ type: "code_interpreter" });
  if (tools.length) runBody.tools = tools;

  const runRes = await axios.post(`${BASE}/threads/${encodeURIComponent(threadId)}/runs`, runBody, { headers: headers(apiKey), timeout: 120000 });
  const runId = runRes.data.id;

  // Poll until complete
  const completedRun = await waitForRun(threadId, runId, apiKey);

  // Fetch messages
  const msgRes = await axios.get(
    `${BASE}/threads/${encodeURIComponent(threadId)}/messages?order=asc&limit=20`,
    { headers: headers(apiKey), timeout: 120000 },
  );

  const messages = (msgRes.data.data || []).map((m) => ({
    role: m.role,
    content: m.content?.map((c) => c.text?.value || "").join("") || "",
  }));

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");

  return {
    threadId,
    runId,
    status: "completed",
    lastMessage: lastAssistantMsg?.content || "",
    messages,
    usage: completedRun.usage || {},
  };
}

async function opListMessages(config, apiKey) {
  if (!config.threadId) return { success: false, error: "OpenAI Assistants listMessages: 'threadId' is required.", skipped: true };
  const limit = Math.min(parseInt(config.limit) || 20, 100);
  const res = await axios.get(
    `${BASE}/threads/${encodeURIComponent(config.threadId)}/messages?order=asc&limit=${limit}`,
    { headers: headers(apiKey), timeout: 120000 },
  );
  const messages = (res.data.data || []).map((m) => ({
    role: m.role,
    content: m.content?.map((c) => c.text?.value || "").join("") || "",
    createdAt: m.created_at,
  }));
  return { threadId: config.threadId, messages, count: messages.length };
}

async function opDeleteThread(config, apiKey) {
  if (!config.threadId) return { success: false, error: "OpenAI Assistants deleteThread: 'threadId' is required.", skipped: true };
  await axios.delete(`${BASE}/threads/${encodeURIComponent(config.threadId)}`, { headers: headers(apiKey), timeout: 120000 });
  return { deleted: true, threadId: config.threadId };
}

const OPERATIONS = {
  createThread: opCreateThread,
  addMessageAndRun: opAddMessageAndRun,
  listMessages: opListMessages,
  deleteThread: opDeleteThread,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "addMessageAndRun";
    const handler = OPERATIONS[operation];
    if (!handler) throw new Error(`OpenAI Assistants: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId) return { success: false, error: "OpenAI Assistants: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `OpenAI Assistants: Could not resolve credential — ${e.message}`, skipped: true };
    }

    try {
      return await handler(config, apiKey);
    } catch (err) {
      handleError(err);
    }
  },
};
