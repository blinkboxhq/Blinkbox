/**
 * POSTGRES — shared primitives. Dynamic-imports pg, resolves the connection
 * string credential and opens a Client (connect failures propagate to
 * handleError — the monolith did NOT skip on a failed connect). Error mapping is
 * verbatim. Handlers receive (config, client).
 */
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export async function getClient(credentialId, workspaceId) {
  const { default: pg } = await import("pg");
  const { Client } = pg;
  const connString = await getOAuthToken(credentialId, workspaceId, "PostgreSQL");
  const client = new Client({ connectionString: connString, connectionTimeoutMillis: 10000, statement_timeout: 30000 });
  await client.connect();
  return client;
}

export function handleError(err) {
  if (err.message?.startsWith("PostgreSQL")) throw err;
  const code = err.code ?? "";
  if (code === "28P01" || code === "28000") throw new Error("PostgreSQL: Authentication failed. Check credentials.");
  if (code === "3D000") throw new Error(`PostgreSQL: Database not found — ${err.message}`);
  if (code === "ECONNREFUSED" || code === "ETIMEDOUT") throw new Error(`PostgreSQL: Cannot connect to server — ${err.message}`);
  if (code?.startsWith("42")) throw new Error(`PostgreSQL: SQL error — ${err.message}`);
  throw new Error(`PostgreSQL: ${err.message}`);
}
