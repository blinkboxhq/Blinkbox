import mongoose from "mongoose";
import pg from "pg";
import mysql2 from "mysql2/promise";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const safeIdent = (name, fallback) => {
  const v = String(name || fallback);
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(v)) throw new Error(`[db_trigger] invalid identifier: ${v}`);
  return v;
};

// Builds the SELECT for each event. `quote` wraps an identifier for the dialect.
// `cursor` is the highest id/timestamp seen on the previous poll (state.cursor).
function buildEventSql(config, limit, quote, ph) {
  const event = config.event || "query";
  const table = quote(safeIdent(config.table, "records"));
  const cursorCol = quote(safeIdent(config.cursorColumn || "id", "id"));
  const cursor = config.__cursor;
  if (event === "query") {
    return { sql: config.query || `SELECT * FROM ${table} ORDER BY ${cursorCol} DESC LIMIT ${limit}`, params: config.params || [] };
  }
  if (event === "insert") {
    // new rows since the last seen cursor — the real "row inserted" signal
    if (cursor != null) return { sql: `SELECT * FROM ${table} WHERE ${cursorCol} > ${ph(1)} ORDER BY ${cursorCol} ASC LIMIT ${limit}`, params: [cursor] };
    return { sql: `SELECT * FROM ${table} ORDER BY ${cursorCol} DESC LIMIT ${limit}`, params: [] };
  }
  if (event === "update") {
    const upCol = quote(safeIdent(config.watchColumn || config.updatedColumn || "updated_at", "updated_at"));
    if (cursor != null) return { sql: `SELECT * FROM ${table} WHERE ${upCol} > ${ph(1)} ORDER BY ${upCol} DESC LIMIT ${limit}`, params: [cursor] };
    return { sql: `SELECT * FROM ${table} ORDER BY ${upCol} DESC LIMIT ${limit}`, params: [] };
  }
  // delete is detected by the caller comparing snapshots; default to latest rows
  return { sql: `SELECT * FROM ${table} ORDER BY ${cursorCol} DESC LIMIT ${limit}`, params: [] };
}

export default {
  async run(config, input) {
    if (input?.rows || input?.documents) return input;
    const dbType = config.dbType || config.type || "mongodb";
    const limit = Math.min(config.limit || 10, 500);
    let connStr = config.connectionString;
    if (!connStr && config.credentialId) {
      connStr = await getOAuthToken(config.credentialId, config.workspaceId, "Database").catch(() => null);
    }
    if (!connStr) throw new Error("[db_trigger] connectionString or credentialId is required");
    if (dbType === "mongodb") {
      const conn = await mongoose.createConnection(connStr).asPromise();
      try {
        const db = conn.db;
        const collection = db.collection(config.collection || "records");
        const filter = config.filter ? JSON.parse(config.filter) : {};
        const sort = config.sort ? JSON.parse(config.sort) : { _id: -1 };
        const docs = await collection.find(filter).sort(sort).limit(limit).toArray();
        const cleaned = docs.map(d => ({ ...d, _id: d._id?.toString(), id: d._id?.toString() }));
        return { dbType, collection: config.collection, documents: cleaned, count: cleaned.length, latestDocument: cleaned[0] ?? null, triggeredAt: new Date().toISOString() };
      } finally { await conn.close(); }
    }
    if (dbType === "postgresql" || dbType === "postgres") {
      const client = new pg.Client({ connectionString: connStr, ssl: config.ssl ? { rejectUnauthorized: false } : false, connectionTimeoutMillis: 15000 });
      await client.connect();
      try {
        const built = buildEventSql({ ...config, __cursor: input?.cursor }, limit, (id) => `"${id}"`, (i) => `$${i}`);
        const { rows, fields } = await client.query(built.sql, built.params);
        const cursorCol = config.cursorColumn || "id";
        const nextCursor = rows.length ? rows[rows.length - 1][cursorCol] ?? rows[0][cursorCol] : input?.cursor;
        return { dbType, event: config.event || "query", table: config.table, columns: fields.map(f => f.name), rows, count: rows.length, latestRow: rows[0] ?? null, cursor: nextCursor, triggeredAt: new Date().toISOString() };
      } finally { await client.end(); }
    }
    if (dbType === "mysql") {
      const conn = await mysql2.createConnection({ uri: connStr, connectTimeout: 15000 });
      try {
        const built = buildEventSql({ ...config, __cursor: input?.cursor }, limit, (id) => `\`${id}\``, () => "?");
        const [rows, fields] = await conn.execute(built.sql, built.params);
        const cursorCol = config.cursorColumn || "id";
        const nextCursor = rows.length ? rows[rows.length - 1][cursorCol] ?? rows[0][cursorCol] : input?.cursor;
        return { dbType, event: config.event || "query", table: config.table, columns: fields.map(f => f.name), rows, count: rows.length, latestRow: rows[0] ?? null, cursor: nextCursor, triggeredAt: new Date().toISOString() };
      } finally { await conn.end(); }
    }
    throw new Error(`[db_trigger] Unsupported dbType: ${dbType}. Use mongodb, postgresql, or mysql`);
  },
};
