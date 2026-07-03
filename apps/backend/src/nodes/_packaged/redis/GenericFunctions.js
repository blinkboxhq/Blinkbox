/**
 * REDIS — shared primitives. Resolves the connection-URL credential and pools
 * IORedis clients keyed by URL (preserved verbatim from the monolith — this is a
 * connection pool, not per-op state). Maps errors verbatim. Handlers receive
 * (config, redis).
 */
import IORedis from "ioredis";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

const clients = new Map();

export async function getClient(credentialId, workspaceId) {
  const url = await getOAuthToken(credentialId, workspaceId, "Redis");

  if (clients.has(url)) return clients.get(url);

  const client = new IORedis(url, {
    connectTimeout: 10000,
    lazyConnect: false,
    maxRetriesPerRequest: 2,
  });

  await new Promise((resolve, reject) => {
    client.once("ready", resolve);
    client.once("error", reject);
  });

  clients.set(url, client);
  return client;
}

export function stringify(value) {
  return typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
}

export function tryParse(result) {
  let parsed = result;
  try { parsed = JSON.parse(result); } catch {}
  return parsed;
}

export function handleError(err) {
  const msg = err?.message ?? String(err);
  if (msg.includes("NOAUTH") || msg.includes("WRONGPASS")) throw new Error("Redis: Authentication failed. Check password.");
  if (msg.includes("ECONNREFUSED") || msg.includes("ETIMEDOUT")) throw new Error(`Redis: Cannot connect — ${msg}`);
  if (msg.startsWith("Redis:")) throw err;
  throw new Error(`Redis: ${msg}`);
}
