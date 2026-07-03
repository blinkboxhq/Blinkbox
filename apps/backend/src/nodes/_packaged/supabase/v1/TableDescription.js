/**
 * SUPABASE — Table (PostgREST) resource. select / insert / update / upsert /
 * delete preserved verbatim from the monolith; count, deleteAll and selectSingle
 * added for parity. Every table op skips when 'table' is missing (the monolith
 * checked this once before the table branches). Handlers receive (config, supabase).
 */
import { applyFilter, parsePayload, requireTable } from "../GenericFunctions.js";

async function opSelect(config, supabase) {
  const miss = requireTable(config); if (miss) return miss;
  const { table, column = "*", filter, filterOperator, filterValue, filterColumn2, filterOperator2, filterValue2, orderBy, orderAsc = true, limit = 100 } = config;
  let q = supabase.from(table).select(column || "*").limit(Number(limit));
  q = applyFilter(q, filter, filterOperator, filterValue);
  q = applyFilter(q, filterColumn2, filterOperator2, filterValue2);
  if (orderBy) q = q.order(orderBy, { ascending: orderAsc !== false });
  const { data: rows, error } = await q;
  if (error) throw error;
  return { rows: rows ?? [], count: rows?.length ?? 0, table };
}

async function opInsert(config, supabase) {
  const miss = requireTable(config); if (miss) return miss;
  const { table } = config;
  const payload = parsePayload(config.data);
  const { data: result, error } = await supabase.from(table).insert(payload).select();
  if (error) throw error;
  return { inserted: result, count: result?.length ?? 0, table };
}

async function opUpdate(config, supabase) {
  const miss = requireTable(config); if (miss) return miss;
  const { table, filter, filterOperator, filterValue } = config;
  if (!filter || filterValue === undefined) return { success: false, error: "Supabase update: 'filter' (column) and 'filterValue' are required — configure this field.", skipped: true };
  const payload = parsePayload(config.data);
  let uq = supabase.from(table).update(payload);
  uq = applyFilter(uq, filter, filterOperator, filterValue);
  const { data: result, error } = await uq.select();
  if (error) throw error;
  return { updated: result, count: result?.length ?? 0, table };
}

async function opUpsert(config, supabase) {
  const miss = requireTable(config); if (miss) return miss;
  const { table, conflictColumns } = config;
  const payload = parsePayload(config.data);
  const { data: result, error } = await supabase.from(table).upsert(payload, { onConflict: conflictColumns ?? undefined }).select();
  if (error) throw error;
  return { upserted: result, count: result?.length ?? 0, table };
}

async function opDelete(config, supabase) {
  const miss = requireTable(config); if (miss) return miss;
  const { table, filter, filterOperator, filterValue } = config;
  if (!filter || filterValue === undefined) return { success: false, error: "Supabase delete: 'filter' (column) and 'filterValue' are required — configure this field.", skipped: true };
  let dq = supabase.from(table).delete();
  dq = applyFilter(dq, filter, filterOperator, filterValue);
  const { data: result, error } = await dq.select();
  if (error) throw error;
  return { deleted: result, count: result?.length ?? 0, table };
}

async function opCount(config, supabase) {
  const miss = requireTable(config); if (miss) return miss;
  const { table, filter, filterOperator, filterValue } = config;
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  q = applyFilter(q, filter, filterOperator, filterValue);
  const { count, error } = await q;
  if (error) throw error;
  return { count: count ?? 0, table };
}

async function opSelectSingle(config, supabase) {
  const miss = requireTable(config); if (miss) return miss;
  const { table, column = "*", filter, filterOperator, filterValue } = config;
  let q = supabase.from(table).select(column || "*");
  q = applyFilter(q, filter, filterOperator, filterValue);
  const { data: row, error } = await q.maybeSingle();
  if (error) throw error;
  return { row: row ?? null, found: !!row, table };
}

async function opDeleteAll(config, supabase) {
  const miss = requireTable(config); if (miss) return miss;
  const { table } = config;
  if (config.confirm !== true) return { success: false, error: "Supabase deleteAll: set 'confirm' to true to delete every row in the table.", skipped: true };
  const { data: result, error } = await supabase.from(table).delete().neq("id", null).select();
  if (error) throw error;
  return { deleted: result ?? [], count: result?.length ?? 0, table };
}

export const tableOperations = {
  select: opSelect,
  insert: opInsert,
  update: opUpdate,
  upsert: opUpsert,
  delete: opDelete,
  count: opCount,
  selectSingle: opSelectSingle,
  deleteAll: opDeleteAll,
};
