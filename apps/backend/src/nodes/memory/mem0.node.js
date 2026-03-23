/**
 * MEM0 NODE
 *
 * Integrates with the Mem0 REST API for long-term user memory.
 * Mem0 stores facts, preferences, and context about users that persist
 * across sessions — like a personal knowledge graph.
 *
 * On each execution:
 *   1. Fetches the user's memory timeline from Mem0
 *   2. Formats memories as system messages for the AI Agent
 *   3. Optionally adds the current input as a new memory
 *
 * Config:
 *   userId       — Mem0 user identifier
 *   sessionId    — Optional session scope
 *   credentialId — Mem0 API key credential
 *   addMemory    — Whether to also store the input as a new memory (default: false)
 *
 * Output:
 *   { messages: [{ role, content }, ...], sessionId, userId, memoryCount }
 *
 * API Reference: https://docs.mem0.ai/api-reference
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const MEM0_API = "https://api.mem0.ai/v1";

export default {
  async run(config, input, context = {}) {
    const {
      userId,
      sessionId,
      credentialId,
      addMemory = false,
    } = config;

    // ── Validate ────────────────────────────────────────────────────────
    if (!userId) {
      throw new Error("Mem0: 'userId' is required.");
    }
    if (!credentialId) {
      throw new Error("Mem0: 'credentialId' is required. Add a Mem0 API key credential.");
    }

    const cred = await resolveCredential(credentialId, context.workspaceId, "Mem0");
    const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    const headers = {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    };

    // ── Optionally add new memory from input ────────────────────────────
    if (addMemory && input) {
      const content =
        typeof input === "string"
          ? input
          : input.content || input.message || JSON.stringify(input);

      try {
        await axios.post(
          `${MEM0_API}/memories/`,
          {
            messages: [{ role: "user", content }],
            user_id: userId,
            ...(sessionId && { metadata: { session_id: sessionId } }),
          },
          { headers, timeout: 15000 }
        );
      } catch (err) {
        // Non-fatal: log but don't fail the entire node
        console.warn(`Mem0: Failed to add memory — ${err.response?.status || err.message}`);
      }
    }

    // ── Fetch user's memory timeline ────────────────────────────────────
    try {
      const res = await axios.get(`${MEM0_API}/memories/`, {
        params: { user_id: userId },
        headers,
        timeout: 15000,
      });

      const memories = res.data?.results || res.data || [];

      // ── Format as message array ─────────────────────────────────────
      // Each memory becomes a system message so the AI Agent receives
      // user context without it being confused as conversation history.
      const messages = memories.map((mem) => ({
        role: "system",
        content: typeof mem === "string" ? mem : mem.memory || mem.text || JSON.stringify(mem),
      }));

      return {
        messages,
        sessionId: sessionId || null,
        userId,
        memoryCount: messages.length,
      };
    } catch (err) {
      if (err.response?.status === 401) {
        throw new Error("Mem0: Invalid API key. Check your Mem0 credential.");
      }
      if (err.response?.status === 404) {
        // No memories found — return empty array (not an error)
        return {
          messages: [],
          sessionId: sessionId || null,
          userId,
          memoryCount: 0,
        };
      }
      throw new Error(`Mem0 failed: ${err.response?.status || err.code} — ${err.message}`);
    }
  },
};
