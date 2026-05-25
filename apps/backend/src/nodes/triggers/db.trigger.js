import mongoose from "mongoose";
import pg from "pg";
import mysql2 from "mysql2/promise";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

export default {
  async run(config, input) {
    if (input?.rows || input?.documents) return input;
    const dbType = config.dbType || config.type || "mongodb";
    const query = config.query || config.sql;
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
        const sql = query || `SELECT * FROM ${config.table || "records"} ORDER BY id DESC LIMIT ${limit}`;
        const { rows, fields } = await client.query(sql, config.params || []);
        return { dbType, table: config.table, columns: fields.map(f => f.name), rows, count: rows.length, latestRow: rows[0] ?? null, triggeredAt: new Date().toISOString() };
      } finally { await client.end(); }
    }
    if (dbType === "mysql") {
      const conn = await mysql2.createConnection({ uri: connStr, connectTimeout: 15000 });
      try {
        const sql = query || `SELECT * FROM \`${config.table || "records"}\` ORDER BY id DESC LIMIT ${limit}`;
        const [rows, fields] = await conn.execute(sql, config.params || []);
        return { dbType, table: config.table, columns: fields.map(f => f.name), rows, count: rows.length, latestRow: rows[0] ?? null, triggeredAt: new Date().toISOString() };
      } finally { await conn.end(); }
    }
    throw new Error(`[db_trigger] Unsupported dbType: ${dbType}. Use mongodb, postgresql, or mysql`);
  },
};
