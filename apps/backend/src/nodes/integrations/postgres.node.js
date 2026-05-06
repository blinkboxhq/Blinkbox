/**
 * POSTGRES NODE
 * Execute raw SQL queries against a PostgreSQL database.
 *
 * Operations:
 *   query     — Run any SQL query, return rows (SELECT)
 *   execute   — Run INSERT/UPDATE/DELETE, return affected rows count
 *   batch     — Execute multiple statements in a transaction
 *
 * Auth: Connection string stored in vault (postgresql://user:pass@host:5432/db)
 *       OR individual fields: host, port, database, user, password
 *
 * Config:
 *   credentialId  — Vault ref holding the connection string
 *   sql           — SQL to execute (supports $1, $2 parameterized queries)
 *   params        — Array of parameter values for $1, $2, etc. (optional)
 *   operation     — "query" (default) | "execute" | "batch"
 *   statements    — Array of SQL strings for "batch" mode
 *   rowLimit      — Max rows returned (default: 1000)
 */

import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

async function getClient(credentialId, workspaceId) {
  const { default: pg } = await import("pg");
  const { Client } = pg;
  const cred = await resolveCredential(credentialId, workspaceId, "PostgreSQL");
  const connString = decrypt(cred.encryptedData, cred.iv, cred.authTag);
  const client = new Client({ connectionString: connString, connectionTimeoutMillis: 10000, statement_timeout: 30000 });
  await client.connect();
  return client;
}

function handleError(err) {
  if (err.message?.startsWith("PostgreSQL")) throw err;
  const code = err.code ?? "";
  if (code === "28P01" || code === "28000") throw new Error("PostgreSQL: Authentication failed. Check credentials.");
  if (code === "3D000") throw new Error(`PostgreSQL: Database not found — ${err.message}`);
  if (code === "ECONNREFUSED" || code === "ETIMEDOUT") throw new Error(`PostgreSQL: Cannot connect to server — ${err.message}`);
  if (code?.startsWith("42")) throw new Error(`PostgreSQL: SQL error — ${err.message}`);
  throw new Error(`PostgreSQL: ${err.message}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "query", rowLimit = 1000 } = config;
    let client;

    try {
      client = await getClient(config.credentialId, context.workspaceId);

      if (operation === "batch") {
        const statements = Array.isArray(config.statements) ? config.statements : JSON.parse(config.statements ?? "[]");
        if (!statements.length) return { success: false, error: "PostgreSQL batch: 'statements' array is required.", skipped: true };
        await client.query("BEGIN");
        const results = [];
        for (const stmt of statements) {
          const res = await client.query(typeof stmt === "string" ? stmt : stmt.sql, stmt.params ?? []);
          results.push({ rowCount: res.rowCount, command: res.command });
        }
        await client.query("COMMIT");
        return { results, statementCount: results.length };
      }

      if (!config.sql) return { success: false, error: "PostgreSQL: 'sql' is required.", skipped: true };
      let params = config.params ?? [];
      if (typeof params === "string") { try { params = JSON.parse(params); } catch {} }

      const res = await client.query(config.sql, Array.isArray(params) ? params : []);

      if (operation === "execute") {
        return { rowCount: res.rowCount, command: res.command };
      }

      const rows = (res.rows ?? []).slice(0, Number(rowLimit));
      return { rows, count: rows.length, total: res.rowCount, fields: res.fields?.map((f) => ({ name: f.name, type: f.dataTypeID })) ?? [] };

    } catch (err) {
      handleError(err);
    } finally {
      client?.end().catch(() => {});
    }
  },
};
