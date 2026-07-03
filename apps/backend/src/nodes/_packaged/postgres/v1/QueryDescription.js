/**
 * POSTGRES — Query & Execute resource. `query` (rows) and `execute` (rowCount)
 * preserved verbatim from the monolith; queryOne, insert, update, deleteRows,
 * upsert added for parity — all build parameterized SQL (never string-interpolate
 * values). Handlers receive (config, client).
 */

function parseParams(config) {
  let params = config.params ?? [];
  if (typeof params === "string") { try { params = JSON.parse(params); } catch {} }
  return Array.isArray(params) ? params : [];
}

function ident(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(name))) throw new Error(`PostgreSQL: Invalid identifier '${name}'.`);
  return `"${name}"`;
}

async function opQuery(config, client) {
  if (!config.sql) return { success: false, error: "PostgreSQL: 'sql' is required.", skipped: true };
  const res = await client.query(config.sql, parseParams(config));
  const rows = (res.rows ?? []).slice(0, Number(config.rowLimit ?? 1000));
  return { rows, count: rows.length, total: res.rowCount, fields: res.fields?.map((f) => ({ name: f.name, type: f.dataTypeID })) ?? [] };
}

async function opExecute(config, client) {
  if (!config.sql) return { success: false, error: "PostgreSQL: 'sql' is required.", skipped: true };
  const res = await client.query(config.sql, parseParams(config));
  return { rowCount: res.rowCount, command: res.command };
}

async function opQueryOne(config, client) {
  if (!config.sql) return { success: false, error: "PostgreSQL: 'sql' is required.", skipped: true };
  const res = await client.query(config.sql, parseParams(config));
  const row = (res.rows ?? [])[0] ?? null;
  return { row, found: !!row, total: res.rowCount };
}

function parseValues(config, label = "values") {
  let values = config.values;
  if (typeof values === "string") { try { values = JSON.parse(values); } catch { throw new Error(`PostgreSQL: Invalid JSON for '${label}'.`); } }
  if (!values || typeof values !== "object" || Array.isArray(values)) return null;
  return values;
}

async function opInsert(config, client) {
  const table = config.table;
  if (!table) return { success: false, error: "PostgreSQL insert: 'table' is required.", skipped: true };
  const values = parseValues(config);
  if (!values || Object.keys(values).length === 0) return { success: false, error: "PostgreSQL insert: 'values' object is required.", skipped: true };
  const cols = Object.keys(values);
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const sql = `INSERT INTO ${ident(table)} (${cols.map(ident).join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
  const res = await client.query(sql, cols.map((c) => values[c]));
  return { row: res.rows?.[0] ?? null, rowCount: res.rowCount, command: res.command };
}

async function opUpdate(config, client) {
  const table = config.table;
  if (!table) return { success: false, error: "PostgreSQL update: 'table' is required.", skipped: true };
  const values = parseValues(config);
  if (!values || Object.keys(values).length === 0) return { success: false, error: "PostgreSQL update: 'values' object is required.", skipped: true };
  if (!config.where) return { success: false, error: "PostgreSQL update: 'where' clause is required.", skipped: true };
  const cols = Object.keys(values);
  const setClause = cols.map((c, i) => `${ident(c)} = $${i + 1}`).join(", ");
  const whereParams = parseParams(config);
  const whereShifted = config.where.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + cols.length}`);
  const sql = `UPDATE ${ident(table)} SET ${setClause} WHERE ${whereShifted} RETURNING *`;
  const res = await client.query(sql, [...cols.map((c) => values[c]), ...whereParams]);
  return { rows: res.rows ?? [], rowCount: res.rowCount, command: res.command };
}

async function opDeleteRows(config, client) {
  const table = config.table;
  if (!table) return { success: false, error: "PostgreSQL delete: 'table' is required.", skipped: true };
  if (!config.where) return { success: false, error: "PostgreSQL delete: 'where' clause is required.", skipped: true };
  const sql = `DELETE FROM ${ident(table)} WHERE ${config.where} RETURNING *`;
  const res = await client.query(sql, parseParams(config));
  return { rows: res.rows ?? [], rowCount: res.rowCount, command: res.command };
}

async function opUpsert(config, client) {
  const table = config.table;
  if (!table) return { success: false, error: "PostgreSQL upsert: 'table' is required.", skipped: true };
  const values = parseValues(config);
  if (!values || Object.keys(values).length === 0) return { success: false, error: "PostgreSQL upsert: 'values' object is required.", skipped: true };
  const conflictCols = Array.isArray(config.conflictColumns) ? config.conflictColumns : (typeof config.conflictColumns === "string" ? config.conflictColumns.split(",").map((s) => s.trim()).filter(Boolean) : []);
  if (conflictCols.length === 0) return { success: false, error: "PostgreSQL upsert: 'conflictColumns' is required.", skipped: true };
  const cols = Object.keys(values);
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const updates = cols.filter((c) => !conflictCols.includes(c)).map((c) => `${ident(c)} = EXCLUDED.${ident(c)}`);
  const conflictSql = updates.length ? `DO UPDATE SET ${updates.join(", ")}` : "DO NOTHING";
  const sql = `INSERT INTO ${ident(table)} (${cols.map(ident).join(", ")}) VALUES (${placeholders.join(", ")}) ON CONFLICT (${conflictCols.map(ident).join(", ")}) ${conflictSql} RETURNING *`;
  const res = await client.query(sql, cols.map((c) => values[c]));
  return { row: res.rows?.[0] ?? null, rowCount: res.rowCount, command: res.command };
}

export const queryOperations = {
  query: opQuery,
  execute: opExecute,
  queryOne: opQueryOne,
  insert: opInsert,
  update: opUpdate,
  deleteRows: opDeleteRows,
  upsert: opUpsert,
};
