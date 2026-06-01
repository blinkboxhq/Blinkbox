import { getOAuthToken } from "../../utils/getOAuthToken.js";

async function getClient(credentialId, workspaceId) {
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
  return createClient(url, key, { auth: { persistSession: false } });
}

function handleError(err) {
  const msg = err?.message ?? String(err);
  if (msg.includes("Invalid API key")) throw new Error("Supabase: Invalid API key. Check credential.");
  if (msg.includes("relation") && msg.includes("not exist")) throw new Error(`Supabase: Table not found — ${msg}`);
  throw new Error(`Supabase: ${msg}`);
}

function applyFilter(q, column, operator, value) {
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

export default {
  async run(config, input, context = {}) {
    const {
      operation = "select", table, column = "*",
      filter, filterValue, filterOperator,
      filterColumn2, filterValue2, filterOperator2,
      data, conflictColumns, rpcFunction, rpcParams, limit = 100,
      orderBy, orderAsc = true,
    } = config;

    if (!config.credentialId) {
      return { success: false, error: "Supabase: No credential selected — pick a Supabase credential.", skipped: true };
    }

    let supabase;
    try {
      supabase = await getClient(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Supabase: Could not resolve credential — ${e.message}`, skipped: true };
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
        q = applyFilter(q, filter, filterOperator, filterValue);
        q = applyFilter(q, filterColumn2, filterOperator2, filterValue2);
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
        let uq = supabase.from(table).update(payload);
        uq = applyFilter(uq, filter, filterOperator, filterValue);
        const { data: result, error } = await uq.select();
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
        let dq = supabase.from(table).delete();
        dq = applyFilter(dq, filter, filterOperator, filterValue);
        const { data: result, error } = await dq.select();
        if (error) throw error;
        return { deleted: result, count: result?.length ?? 0, table };
      }

      throw new Error(`Supabase: Unknown operation '${operation}'.`);
    } catch (err) {
      handleError(err);
    }
  },
};
