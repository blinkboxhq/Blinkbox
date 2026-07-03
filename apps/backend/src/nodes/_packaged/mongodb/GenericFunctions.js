/**
 * MONGODB — shared primitives. Resolves the connection-string credential and
 * pools mongoose connections keyed by `${credentialId}:${dbName}` (preserved
 * verbatim from the monolith — this is a connection pool, not per-op state).
 * parseJson and handleError are verbatim. Handlers receive (config, ctx) where
 * ctx is { col, collection, filterDoc, projectionDoc, sortDoc, updateDoc }.
 */
import mongoose from "mongoose";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

const clients = new Map();

export async function getDb(credentialId, workspaceId, dbName) {
  const uri = await getOAuthToken(credentialId, workspaceId, "MongoDB");

  const key = `${credentialId}:${dbName ?? ""}`;
  if (clients.has(key)) return clients.get(key);

  const conn = await mongoose.createConnection(uri, {
    dbName: dbName || undefined,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  }).asPromise();

  clients.set(key, conn);
  return conn;
}

export function parseJson(val, label) {
  if (typeof val === "object" && val !== null) return val;
  if (!val || val === "") return {};
  try { return JSON.parse(val); }
  catch { throw new Error(`MongoDB: Invalid JSON for '${label}'.`); }
}

export function handleError(err) {
  const msg = err?.message ?? String(err);
  if (msg.includes("Authentication failed")) throw new Error("MongoDB: Authentication failed. Check connection string.");
  if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("ETIMEDOUT"))
    throw new Error(`MongoDB: Cannot connect — ${msg}`);
  if (msg.startsWith("MongoDB:")) throw err;
  throw new Error(`MongoDB: ${msg}`);
}
