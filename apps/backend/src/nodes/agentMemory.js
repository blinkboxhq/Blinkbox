/**
 * Agent memory — what the Memory slot actually does.
 *
 * Memory sub-nodes hang off the agent's `memory` handle and never execute as
 * graph nodes, so the slot used to resolve to null. Instead the executor hands
 * the agent the node's config and this module reads/writes the store.
 *
 * Two layers, both live at once:
 *   recency — the last N turns, kept in Redis, so the agent has the thread.
 *   semantic — every turn embedded into the vector store, recalled by meaning,
 *              so the agent remembers things far outside the window.
 *
 * Semantic recall needs an embedding key, so a provider without a credential
 * degrades to recency alone rather than failing the run.
 */
import axios from "axios";
import { redis } from "../infra/redis.client.js";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";
import VectorMemory from "../models/vectorMemory.model.js";

const WINDOW_TTL_SECONDS = 60 * 60 * 24 * 7;
const EMBED_SCAN_LIMIT = 1000;

// semantic: does this provider embed turns for meaning-based recall?
export const MEMORY_KINDS = {
  agent_memory: { label: "Vector Memory", semantic: true },
  agent_memory_window: { label: "Window Buffer", semantic: false },
  agent_memory_redis: { label: "Redis", semantic: false },
  agent_memory_mongodb: { label: "MongoDB", semantic: true },
  agent_memory_postgres: { label: "PostgreSQL", semantic: false },
  agent_memory_pinecone: { label: "Pinecone", semantic: true },
  agent_memory_supabase: { label: "Supabase", semantic: true },
  agent_memory_zep: { label: "Zep", semantic: false },
};

export const isMemoryNode = (type) => Boolean(MEMORY_KINDS[type]);

/** Executor-side: turn a connected sub-node into something the agent can use. */
export function describeMemoryNode(node) {
  if (!node?.type || !isMemoryNode(node.type)) return null;
  const { config, ...data } = node.data || {};
  const cfg = config && typeof config === "object" ? { ...data, ...config } : data;
  return { __memoryNode: { type: node.type, config: cfg } };
}

function cosine(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

async function embed(text, apiKey, model) {
  const res = await axios.post(
    "https://api.openai.com/v1/embeddings",
    { model: model || "text-embedding-3-small", input: String(text).slice(0, 8000) },
    { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 120000 },
  );
  return res.data.data[0].embedding;
}

async function embedKey(config, workspaceId) {
  if (!config.credentialId) return null;
  try {
    const cred = await resolveCredential(config.credentialId, workspaceId, "Agent Memory");
    return decrypt(cred.encryptedData, cred.iv, cred.authTag);
  } catch {
    return null;
  }
}

function plan(type, config) {
  const kind = MEMORY_KINDS[type] || MEMORY_KINDS.agent_memory_window;
  const session = String(config.sessionName || config.sessionId || "default").slice(0, 200);
  return {
    kind,
    session,
    semantic: kind.semantic,
    windowSize: Math.min(Math.max(parseInt(config.windowSize, 10) || 20, 1), 200),
    topK: Math.min(Math.max(parseInt(config.topK, 10) || 5, 1), 20),
    threshold: config.similarityThreshold !== undefined ? parseFloat(config.similarityThreshold) : 0.7,
    maxMemories: Math.min(Math.max(parseInt(config.maxMemories, 10) || 1000, 10), 10000),
    model: config.embeddingModel || "text-embedding-3-small",
  };
}

const windowKey = (workspaceId, session) => `bb:mem:${workspaceId}:${session}`;
const namespaceOf = (session) => `agent:${session}`;

// A disconnected client still accepts commands and eats the full command
// timeout before rejecting, so skip the call once we know the socket is down.
// "connecting" is not down — that is a cold start, and it must still try.
const DOWN = new Set(["reconnecting", "close", "end"]);
const redisLive = () => redis && !DOWN.has(redis.status);

async function readWindow(key, size) {
  if (!redisLive()) return [];
  try {
    const raw = await redis.get(key);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(-size * 2) : [];
  } catch {
    return [];
  }
}

async function recallSemantic(p, apiKey, workspaceId, query) {
  const docs = await VectorMemory.find({ workspaceId, namespace: namespaceOf(p.session) })
    .select("text embedding createdAt")
    .sort({ createdAt: -1 })
    .limit(EMBED_SCAN_LIMIT)
    .lean();
  if (!docs.length) return [];
  const q = await embed(query, apiKey, p.model);
  return docs
    .map((d) => ({ text: d.text, similarity: cosine(q, d.embedding || []) }))
    .filter((d) => d.similarity >= p.threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, p.topK);
}

/**
 * Everything the agent should know before it answers.
 * -> { messages: [{role, content}], notes: string }
 */
export async function loadAgentMemory({ type, config = {}, workspaceId, query = "" }) {
  const p = plan(type, config);
  const messages = await readWindow(windowKey(workspaceId, p.session), p.windowSize);
  let notes = "";

  if (p.semantic && query) {
    const apiKey = await embedKey(config, workspaceId);
    if (!apiKey) {
      notes = `${p.kind.label} memory has no embedding credential — using recent messages only.`;
    } else {
      try {
        const hits = await recallSemantic(p, apiKey, workspaceId, query);
        if (hits.length) {
          messages.unshift({
            role: "system",
            content:
              "Relevant things you remember from earlier sessions:\n" +
              hits.map((h) => `- ${h.text}`).join("\n"),
          });
        }
      } catch (err) {
        notes = `Memory recall failed: ${err.message}`;
      }
    }
  }

  return { messages, notes, session: p.session };
}

/** Persist one completed turn: always to the window, to vectors when we can. */
export async function saveAgentMemory({ type, config = {}, workspaceId, userText, assistantText }) {
  const p = plan(type, config);
  const turn = [
    { role: "user", content: String(userText ?? "") },
    { role: "assistant", content: String(assistantText ?? "") },
  ];

  if (redisLive()) {
    try {
      const key = windowKey(workspaceId, p.session);
      const prior = await readWindow(key, p.windowSize);
      const next = [...prior, ...turn].slice(-p.windowSize * 2);
      await redis.set(key, JSON.stringify(next), "EX", WINDOW_TTL_SECONDS);
    } catch {
      // Non-fatal: a lost window must never fail the agent run.
    }
  }

  if (!p.semantic) return { stored: "window", session: p.session };

  const apiKey = await embedKey(config, workspaceId);
  if (!apiKey) return { stored: "window", session: p.session };

  try {
    const text = `User: ${turn[0].content}\nAssistant: ${turn[1].content}`.slice(0, 8000);
    const namespace = namespaceOf(p.session);
    const embedding = await embed(text, apiKey, p.model);
    await VectorMemory.create({
      workspaceId,
      namespace,
      memoryKey: `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text,
      embedding,
      tags: ["agent-turn"],
    });

    const count = await VectorMemory.countDocuments({ workspaceId, namespace });
    if (count > p.maxMemories) {
      const stale = await VectorMemory.find({ workspaceId, namespace })
        .select("_id")
        .sort({ createdAt: 1 })
        .limit(count - p.maxMemories)
        .lean();
      await VectorMemory.deleteMany({ _id: { $in: stale.map((d) => d._id) } });
    }
    return { stored: "vector", session: p.session };
  } catch {
    return { stored: "window", session: p.session };
  }
}
