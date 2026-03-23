/**
 * VECTOR MEMORY NODE
 *
 * Semantic memory retrieval via vector database. Embeds a search query
 * and retrieves the most relevant past conversation fragments.
 *
 * Supports Pinecone and Qdrant APIs. The credential should contain the
 * API key, and the config specifies the endpoint and index/collection.
 *
 * Flow:
 *   1. Takes the search query from config (expression-resolved)
 *   2. Calls an embedding API to vectorize the query
 *   3. Queries the vector DB for the top-K nearest matches
 *   4. Returns matches as a message array for the AI Agent
 *
 * Config:
 *   sessionId    — Optional filter for session-scoped results
 *   credentialId — Vector DB API key credential
 *   searchQuery  — The text to embed and search against
 *   topK         — Number of results to return (default: 5)
 *   provider     — "pinecone" | "qdrant" (default: "pinecone")
 *   indexName    — Index/collection name in the vector DB
 *   namespace    — Pinecone namespace (optional)
 *
 * Output:
 *   { messages: [{ role, content }, ...], sessionId, matchCount, provider }
 *
 * NOTE: This is a scaffold. The embedding step requires an OpenAI or
 * compatible embedding API key. In production, factor embedding into
 * a shared utility.
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

export default {
  async run(config, input, context = {}) {
    const {
      sessionId = "default",
      credentialId,
      searchQuery,
      topK = 5,
      provider = "pinecone",
      indexName,
      namespace,
    } = config;

    // ── Validate required fields ────────────────────────────────────────
    if (!searchQuery) {
      throw new Error("Vector Memory: 'searchQuery' is required.");
    }
    if (!credentialId) {
      throw new Error("Vector Memory: 'credentialId' is required. Add a vector DB credential.");
    }
    if (!indexName) {
      throw new Error("Vector Memory: 'indexName' is required (your Pinecone index or Qdrant collection).");
    }

    const cred = await resolveCredential(credentialId, context.workspaceId, "VectorDB");
    const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    // ── Embed the search query ──────────────────────────────────────────
    // NOTE: In production, this should use the workspace's configured
    // embedding provider. For now we scaffold a Pinecone Inference call.
    const queryVector = await embedQuery(searchQuery, apiKey, provider);

    // ── Query the vector DB ─────────────────────────────────────────────
    let matches = [];

    if (provider === "pinecone") {
      matches = await queryPinecone({
        apiKey,
        indexName,
        namespace,
        vector: queryVector,
        topK,
        sessionId,
      });
    } else if (provider === "qdrant") {
      matches = await queryQdrant({
        apiKey,
        collection: indexName,
        vector: queryVector,
        topK,
        sessionId,
      });
    } else {
      throw new Error(`Vector Memory: Unknown provider "${provider}". Use "pinecone" or "qdrant".`);
    }

    // ── Format matches as message array ─────────────────────────────────
    const messages = matches.map((match) => ({
      role: match.metadata?.role || "assistant",
      content: match.metadata?.content || match.metadata?.text || JSON.stringify(match.metadata),
    }));

    return {
      messages,
      sessionId,
      matchCount: messages.length,
      provider,
    };
  },
};

/**
 * Embed a text query into a vector.
 * Scaffold: uses Pinecone Inference or a placeholder.
 */
async function embedQuery(text, apiKey, provider) {
  // Pinecone Inference embedding endpoint
  if (provider === "pinecone") {
    try {
      const res = await axios.post(
        "https://api.pinecone.io/embed",
        {
          model: "multilingual-e5-large",
          inputs: [{ text }],
        },
        {
          headers: {
            "Api-Key": apiKey,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );
      return res.data.data?.[0]?.values || [];
    } catch (err) {
      throw new Error(`Vector Memory: Embedding failed — ${err.response?.status || err.message}`);
    }
  }

  // Qdrant doesn't embed for you — the user must provide pre-embedded vectors
  // or use an external embedding service. Return a placeholder that will fail
  // gracefully with a helpful error.
  throw new Error(
    "Vector Memory (Qdrant): Automatic embedding is not yet supported for Qdrant. " +
    "Use Pinecone with built-in embedding, or pre-embed your query externally."
  );
}

/**
 * Query Pinecone for nearest neighbors.
 */
async function queryPinecone({ apiKey, indexName, namespace, vector, topK, sessionId }) {
  try {
    const body = {
      vector,
      topK,
      includeMetadata: true,
    };
    if (namespace) body.namespace = namespace;
    if (sessionId && sessionId !== "default") {
      body.filter = { session_id: { $eq: sessionId } };
    }

    const res = await axios.post(
      `https://${indexName}.svc.pinecone.io/query`,
      body,
      {
        headers: {
          "Api-Key": apiKey,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    return res.data.matches || [];
  } catch (err) {
    if (err.response?.status === 401) throw new Error("Vector Memory: Invalid Pinecone API key.");
    throw new Error(`Vector Memory (Pinecone) query failed: ${err.response?.status || err.message}`);
  }
}

/**
 * Query Qdrant for nearest neighbors.
 */
async function queryQdrant({ apiKey, collection, vector, topK, sessionId }) {
  try {
    const body = {
      vector,
      limit: topK,
      with_payload: true,
    };
    if (sessionId && sessionId !== "default") {
      body.filter = {
        must: [{ key: "session_id", match: { value: sessionId } }],
      };
    }

    const res = await axios.post(
      `https://cloud.qdrant.io/collections/${collection}/points/search`,
      body,
      {
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    // Qdrant returns { result: [{ payload, score }] }
    return (res.data.result || []).map((point) => ({
      metadata: point.payload || {},
      score: point.score,
    }));
  } catch (err) {
    if (err.response?.status === 401) throw new Error("Vector Memory: Invalid Qdrant API key.");
    throw new Error(`Vector Memory (Qdrant) query failed: ${err.response?.status || err.message}`);
  }
}
