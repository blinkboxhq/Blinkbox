/**
 * SUPABASE — shared primitives. Resolves the JSON { url, key } credential and
 * builds a supabase-js client, plus the filter builder, payload/params parsers
 * and the verbatim error mapper. Handlers receive (config, supabase).
 */
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export async function getClient(credentialId, workspaceId) {
  const { createClient } = await import("@supabase/supabase-js");
  const raw = await getOAuthToken(credentialId, workspaceId, "Supabase");
  let url, key;
  try {
    const parsed = JSON.parse(raw);
    url = parsed.url;
    key = parsed.key ?? parsed.service_role_key ?? parsed.anon_key;
  } catch {
    throw new Error("Supabase: Credential must be JSON { url, key }");
  }
  if (!url || !key) throw new Error("Supabase: Credential must include 'url' and 'key'.");
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init = {}) =>
        fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(120000) }),
    },
  });
}

export function handleError(err) {
  const msg = err?.message ?? String(err);
  if (msg.includes("Invalid API key")) throw new Error("Supabase: Invalid API key. Check credential.");
  if (msg.includes("relation") && msg.includes("not exist")) throw new Error(`Supabase: Table not found — ${msg}`);
  throw new Error(`Supabase: ${msg}`);
}

export function applyFilter(q, column, operator, value) {
  if (!column || value === undefined || value === "") return q;
  const op = operator || "eq";
  switch (op) {
    case "eq":          return q.eq(column, value);
    case "neq":         return q.neq(column, value);
    case "gt":          return q.gt(column, value);
    case "gte":         return q.gte(column, value);
    case "lt":          return q.lt(column, value);
    case "lte":         return q.lte(column, value);
    case "like":        return q.like(column, value);
    case "ilike":       return q.ilike(column, value);
    case "is":          return q.is(column, value === "null" ? null : value);
    case "in":          { let arr = value; if (typeof arr === "string") { try { arr = JSON.parse(arr); } catch { arr = [value]; } } return q.in(column, arr); }
    case "contains":    return q.contains(column, value);
    case "containedBy": return q.containedBy(column, value);
    default:            return q.eq(column, value);
  }
}

export function parsePayload(payload) {
  if (typeof payload === "string") { try { return JSON.parse(payload); } catch { return payload; } }
  return payload;
}

export function requireTable(config) {
  if (!config.table) return { success: false, error: "Supabase: 'table' is required — configure this field.", skipped: true };
  return null;
}
