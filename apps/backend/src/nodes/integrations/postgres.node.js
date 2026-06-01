import { getOAuthToken } from "../../utils/getOAuthToken.js";

async function getClient(credentialId, workspaceId) {
  const { default: pg } = await import("pg");
  const { Client } = pg;
  const connString = await getOAuthToken(credentialId, workspaceId, "PostgreSQL");
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
    if (!config.credentialId) {
      return { success: false, error: "PostgreSQL: No credential selected — pick a PostgreSQL connection string credential.", skipped: true };
    }
    let client;

    try {
      client = await getClient(config.credentialId, context.workspaceId);

      if (operation === "batch") {
        const statements = Array.isArray(config.statements) ? config.statements : (() => { try { return JSON.parse(config.statements ?? "[]"); } catch { throw new Error("PostgreSQL batch: 'statements' must be valid JSON array."); } })();
        if (!statements.length) return { success: false, error: "PostgreSQL batch: 'statements' array is required.", skipped: true };
        await client.query("BEGIN");
        const results = [];
        try {
          for (const stmt of statements) {
            const res = await client.query(typeof stmt === "string" ? stmt : stmt.sql, stmt.params ?? []);
            results.push({ rowCount: res.rowCount, command: res.command });
          }
          await client.query("COMMIT");
        } catch (txErr) {
          await client.query("ROLLBACK").catch(() => {});
          throw txErr;
        }
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
