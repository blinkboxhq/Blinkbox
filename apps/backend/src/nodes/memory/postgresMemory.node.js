/**
 * POSTGRES MEMORY NODE
 *
 * SQL-backed conversation memory using PostgreSQL. Reads and writes messages
 * to a configurable table, filtered by session_id.
 *
 * Expected table schema:
 *   CREATE TABLE memory (
 *     id          SERIAL PRIMARY KEY,
 *     session_id  VARCHAR(255) NOT NULL,
 *     role        VARCHAR(20)  NOT NULL,  -- "user" | "assistant" | "system"
 *     content     TEXT         NOT NULL,
 *     created_at  TIMESTAMPTZ  DEFAULT NOW()
 *   );
 *   CREATE INDEX idx_memory_session ON memory(session_id);
 *
 * On each execution:
 *   1. Appends new input message(s) to the table
 *   2. Fetches all messages for this session, ordered by created_at ASC
 *   3. Returns the full conversation history
 *
 * Config:
 *   sessionId    — Session identifier for filtering
 *   credentialId — Credential containing the Postgres connection string
 *   tableName    — Table name (default: "memory")
 *
 * Output:
 *   { messages: [{ role, content }, ...], sessionId, totalMessages }
 */

import pg from "pg";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const { Client } = pg;

// Whitelist table names to prevent SQL injection
const TABLE_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/;

export default {
  async run(config, input, context = {}) {
    const { sessionId = "default", credentialId, tableName = "memory" } = config;

    // ── Validate table name ─────────────────────────────────────────────
    if (!TABLE_NAME_RE.test(tableName)) {
      throw new Error(
        `Postgres Memory: Invalid table name "${tableName}". Use only letters, numbers, and underscores.`
      );
    }

    // ── Resolve Postgres connection string ───────────────────────────────
    if (!credentialId) {
      throw new Error("Postgres Memory: 'credentialId' is required. Add a Postgres credential.");
    }
    const cred = await resolveCredential(credentialId, context.workspaceId, "Postgres");
    const connectionString = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    // ── Connect ─────────────────────────────────────────────────────────
    const client = new Client({ connectionString, statement_timeout: 10000 });

    try {
      await client.connect();

      // ── Insert new messages ─────────────────────────────────────────
      const newMessages = normalizeInput(input);
      for (const msg of newMessages) {
        await client.query(
          `INSERT INTO ${tableName} (session_id, role, content) VALUES ($1, $2, $3)`,
          [sessionId, msg.role, msg.content]
        );
      }

      // ── Fetch full history for this session ─────────────────────────
      const result = await client.query(
        `SELECT role, content FROM ${tableName} WHERE session_id = $1 ORDER BY created_at ASC`,
        [sessionId]
      );

      const messages = result.rows.map((row) => ({
        role: row.role,
        content: row.content,
      }));

      return {
        messages,
        sessionId,
        totalMessages: messages.length,
      };
    } catch (err) {
      if (err.code === "ECONNREFUSED") {
        throw new Error(
          "Postgres Memory: Connection refused. Check your connection string and ensure the database is running."
        );
      }
      if (err.code === "42P01") {
        throw new Error(
          `Postgres Memory: Table "${tableName}" does not exist. Create it with: CREATE TABLE ${tableName} (id SERIAL PRIMARY KEY, session_id VARCHAR(255), role VARCHAR(20), content TEXT, created_at TIMESTAMPTZ DEFAULT NOW());`
        );
      }
      throw new Error(`Postgres Memory failed: ${err.message}`);
    } finally {
      await client.end().catch(() => {});
    }
  },
};

/**
 * Normalize any input shape into an array of { role, content } messages.
 */
function normalizeInput(input) {
  if (Array.isArray(input)) {
    return input
      .filter((m) => m && typeof m === "object" && m.role && m.content)
      .map((m) => ({ role: String(m.role), content: String(m.content) }));
  }
  if (input && typeof input === "object" && input.messages) {
    return normalizeInput(input.messages);
  }
  if (typeof input === "string" && input.trim()) {
    return [{ role: "user", content: input }];
  }
  if (input && typeof input === "object") {
    return [{ role: "user", content: JSON.stringify(input) }];
  }
  return [];
}
