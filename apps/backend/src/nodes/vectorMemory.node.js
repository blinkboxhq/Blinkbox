/**
 * VECTOR MEMORY NODE
 * Persistent semantic memory for AI agents.
 * Store text as embeddings, recall by meaning. Self-hosted on MongoDB.
 *
 * Operations:
 *   remember     — store text as embedding
 *   recall       — semantic search by meaning
 *   forget       — delete a memory by key
 *   listMemories — list all memories in namespace
 *   clearAll     — delete all memories in namespace
 *
 * Note: Brute-force cosine search works up to ~1000 memories.
 * For larger collections, use the Pinecone node instead.
 */

import axios from "axios";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";
import VectorMemory from "../models/vectorMemory.model.js";

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return dot / denom;
}

async function getEmbedding(text, apiKey, model = "text-embedding-3-small") {
  const response = await axios.post(
    "https://api.openai.com/v1/embeddings",
    { model, input: String(text).slice(0, 8000) },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 30000 },
  );
  return response.data.data[0].embedding;
}

export default {
  async run(config, input, context = {}) {
    const {
      operation = "recall",
      namespace = "default",
      topK = 5,
      threshold = 0.7,
      includeEmbedding = false,
    } = config;

    const workspaceId = context.workspaceId;
    if (!workspaceId) throw new Error("Vector Memory: workspaceId is required.");

    const text = config.text ?? input?.text ?? (typeof input === "string" ? input : null);
    const memoryKey = config.memoryKey || null;
    const tags = config.tags ? (typeof config.tags === "string" ? config.tags.split(",").map((t) => t.trim()).filter(Boolean) : config.tags) : [];

    if (operation === "listMemories") {
      const memories = await VectorMemory.find({ workspaceId, namespace })
        .select("memoryKey text tags metadata createdAt updatedAt")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      return { memories, count: memories.length, namespace };
    }

    if (operation === "clearAll") {
      const result = await VectorMemory.deleteMany({ workspaceId, namespace });
      return { deleted: result.deletedCount, namespace };
    }

    if (operation === "forget") {
      if (!memoryKey) throw new Error("Vector Memory: 'memoryKey' is required for forget operation.");
      const result = await VectorMemory.deleteOne({ workspaceId, namespace, memoryKey });
      return { deleted: result.deletedCount > 0, memoryKey, namespace };
    }

    // remember and recall both need the API key for embeddings
    const cred = await resolveCredential(config.credentialId, workspaceId, "Vector Memory");
    const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    if (operation === "remember") {
      if (!text) throw new Error("Vector Memory: 'text' is required for remember operation.");
      const key = memoryKey || `mem_${Date.now()}`;
      const embedding = await getEmbedding(text, apiKey);

      const existing = await VectorMemory.findOne({ workspaceId, namespace, memoryKey: key });
      let updated = false;
      let doc;

      if (existing) {
        existing.text = text;
        existing.embedding = embedding;
        if (tags.length) existing.tags = tags;
        await existing.save();
        doc = existing;
        updated = true;
      } else {
        doc = await VectorMemory.create({ workspaceId, namespace, memoryKey: key, text, embedding, tags });
      }

      const result = {
        memoryId: doc._id.toString(),
        memoryKey: key,
        text,
        namespace,
        tags,
        createdAt: doc.createdAt?.toISOString(),
        updated,
      };
      if (includeEmbedding) result.embedding = embedding;
      return result;
    }

    if (operation === "recall") {
      if (!text) throw new Error("Vector Memory: 'text' is required for recall operation.");

      const allDocs = await VectorMemory.find({ workspaceId, namespace })
        .select("memoryKey text tags metadata embedding createdAt")
        .limit(1000)
        .lean();

      if (allDocs.length === 0) return { memories: [], count: 0, namespace, query: text };

      const queryEmbedding = await getEmbedding(text, apiKey);

      const scored = allDocs
        .map((doc) => ({
          memoryId: doc._id.toString(),
          memoryKey: doc.memoryKey,
          text: doc.text,
          tags: doc.tags,
          metadata: doc.metadata,
          createdAt: doc.createdAt?.toISOString(),
          similarity: cosineSimilarity(queryEmbedding, doc.embedding),
        }))
        .filter((m) => m.similarity >= parseFloat(threshold))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, parseInt(topK) || 5);

      if (!includeEmbedding) scored.forEach((m) => delete m.embedding);

      const warning = allDocs.length >= 1000
        ? "Memory collection has reached 1000 items — consider using the Pinecone node for better performance."
        : undefined;

      return { memories: scored, count: scored.length, namespace, query: text, ...(warning ? { warning } : {}) };
    }

    throw new Error(`Vector Memory: unknown operation "${operation}"`);
  },
};
