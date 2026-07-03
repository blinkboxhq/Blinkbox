/**
 * POSTGRES — Batch & Schema resource. `batch` preserved verbatim from the
 * monolith (BEGIN → run statements → COMMIT, ROLLBACK on error); transaction
 * (alias-shaped), listTables, tableColumns added for parity. Handlers receive
 * (config, client).
 */

function parseStatements(config) {
  return Array.isArray(config.statements)
    ? config.statements
    : (() => { try { return JSON.parse(config.statements ?? "[]"); } catch { throw new Error("PostgreSQL batch: 'statements' must be valid JSON array."); } })();
}

async function runInTransaction(client, statements) {
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
  return results;
}

async function opBatch(config, client) {
  const statements = parseStatements(config);
  if (!statements.length) return { success: false, error: "PostgreSQL batch: 'statements' array is required.", skipped: true };
  const results = await runInTransaction(client, statements);
  return { results, statementCount: results.length };
}

async function opTransaction(config, client) {
  const statements = parseStatements(config);
  if (!statements.length) return { success: false, error: "PostgreSQL transaction: 'statements' array is required.", skipped: true };
  const results = await runInTransaction(client, statements);
  return { results, statementCount: results.length, committed: true };
}

async function opListTables(config, client) {
  const schema = config.schema || "public";
  const res = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name",
    [schema],
  );
  return { tables: (res.rows ?? []).map((r) => r.table_name), count: res.rowCount, schema };
}

async function opTableColumns(config, client) {
  if (!config.table) return { success: false, error: "PostgreSQL tableColumns: 'table' is required.", skipped: true };
  const schema = config.schema || "public";
  const res = await client.query(
    "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position",
    [schema, config.table],
  );
  return {
    columns: (res.rows ?? []).map((r) => ({ name: r.column_name, type: r.data_type, nullable: r.is_nullable === "YES", default: r.column_default })),
    count: res.rowCount,
    table: config.table,
    schema,
  };
}

export const batchOperations = {
  batch: opBatch,
  transaction: opTransaction,
  listTables: opListTables,
  tableColumns: opTableColumns,
};
