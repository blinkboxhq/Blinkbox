/**
 * SUPABASE NODE
 * Operations: select, insert, update, delete, upsert, rpc, getUser
 * Auth: Supabase URL + service_role key stored in vault
 * Credential format (JSON): { "url": "https://xxx.supabase.co", "key": "eyJ..." }
 */

import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

async function getClient(credentialId, workspaceId) {
  const { createClient } = await import("@supabase/supabase-js");
  const cred = await resolveCredential(credentialId, workspaceId, "Supabase");
  const raw  = decrypt(cred.encryptedData, cred.iv, cred.authTag);
  let url, key;
  try {
    const parsed = JSON.parse(raw);
    url = parsed.url;
    key = parsed.key ?? parsed.service_role_key ?? parsed.anon_key;
  } catch {
    throw new Error("Supabase: Credential must be JSON { url, key }");
  }
  if (!url || !key) throw new Error("Supabase: Credential must include 'url' and 'key'.");
  return createClient(url, key, { auth: { persistSession: false } });
}

function handleError(err) {
  const msg = err?.message ?? String(err);
  if (msg.includes("Invalid API key")) throw new Error("Supabase: Invalid API key. Check credential.");
  if (msg.includes("relation") && msg.includes("not exist")) throw new Error(`Supabase: Table not found — ${msg}`);
  throw new Error(`Supabase: ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "select", table, column = "*", filter, filterValue,
            data, conflictColumns, rpcFunction, rpcParams, limit = 100,
            orderBy, orderAsc = true } = config;

    let supabase;
    try {
      supabase = await getClient(config.credentialId, context.workspaceId);
    } catch (err) {
      handleError(err);
    }

    try {
      if (operation === "rpc") {
        let params = rpcParams;
        if (typeof params === "string") { try { params = JSON.parse(params); } catch {} }
        const { data: result, error } = await supabase.rpc(rpcFunction, params ?? {});
        if (error) throw error;
        return { result, function: rpcFunction };
      }

      if (operation === "getUser") {
        const { data: { user }, error } = await supabase.auth.getUser(config.accessToken ?? "");
        if (error) throw error;
        return { user };
      }

      if (!table) return { success: false, error: "Supabase: 'table' is required — configure this field.", skipped: true };

      if (operation === "select") {
        let q = supabase.from(table).select(column || "*").limit(Number(limit));
        if (filter && filterValue !== undefined) q = q.eq(filter, filterValue);
        if (orderBy) q = q.order(orderBy, { ascending: orderAsc !== false });
        const { data: rows, error } = await q;
        if (error) throw error;
        return { rows: rows ?? [], count: rows?.length ?? 0, table };
      }

      if (operation === "insert") {
        let payload = data;
        if (typeof payload === "string") { try { payload = JSON.parse(payload); } catch {} }
        const { data: result, error } = await supabase.from(table).insert(payload).select();
        if (error) throw error;
        return { inserted: result, count: result?.length ?? 0, table };
      }

      if (operation === "update") {
        if (!filter || filterValue === undefined) return { success: false, error: "Supabase update: 'filter' (column) and 'filterValue' are required — configure this field.", skipped: true };
        let payload = data;
        if (typeof payload === "string") { try { payload = JSON.parse(payload); } catch {} }
        const { data: result, error } = await supabase.from(table).update(payload).eq(filter, filterValue).select();
        if (error) throw error;
        return { updated: result, count: result?.length ?? 0, table };
      }

      if (operation === "upsert") {
        let payload = data;
        if (typeof payload === "string") { try { payload = JSON.parse(payload); } catch {} }
        const { data: result, error } = await supabase.from(table).upsert(payload, {
          onConflict: conflictColumns ?? undefined,
        }).select();
        if (error) throw error;
        return { upserted: result, count: result?.length ?? 0, table };
      }

      if (operation === "delete") {
        if (!filter || filterValue === undefined) return { success: false, error: "Supabase delete: 'filter' (column) and 'filterValue' are required — configure this field.", skipped: true };
        const { data: result, error } = await supabase.from(table).delete().eq(filter, filterValue).select();
        if (error) throw error;
        return { deleted: result, count: result?.length ?? 0, table };
      }

      throw new Error(`Supabase: Unknown operation '${operation}'.`);
    } catch (err) {
      handleError(err);
    }
  },
};
