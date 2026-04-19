/**
 * MONGODB NODE
 * Operations: find, findOne, insertOne, insertMany, updateOne, updateMany,
 *             deleteOne, deleteMany, aggregate, countDocuments
 * Auth: MongoDB connection string in vault (mongodb+srv://...)
 */

import mongoose from "mongoose";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const clients = new Map();

async function getDb(credentialId, workspaceId, dbName) {
  const cred = await resolveCredential(credentialId, workspaceId, "MongoDB");
  const uri  = decrypt(cred.encryptedData, cred.iv, cred.authTag);

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

function parseJson(val, label) {
  if (typeof val === "object" && val !== null) return val;
  if (!val || val === "") return {};
  try { return JSON.parse(val); }
  catch { throw new Error(`MongoDB: Invalid JSON for '${label}'.`); }
}

function handleError(err) {
  const msg = err?.message ?? String(err);
  if (msg.includes("Authentication failed")) throw new Error("MongoDB: Authentication failed. Check connection string.");
  if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("ETIMEDOUT"))
    throw new Error(`MongoDB: Cannot connect — ${msg}`);
  if (msg.startsWith("MongoDB:")) throw err;
  throw new Error(`MongoDB: ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const {
      operation = "find",
      database, collection,
      filter, update, document, documents,
      pipeline, projection, sort, limit = 100, skip = 0,
      upsert = false, arrayFilters,
    } = config;

    if (!collection) throw new Error("MongoDB: 'collection' is required.");

    let conn;
    try {
      conn = await getDb(config.credentialId, context.workspaceId, database);
    } catch (err) {
      handleError(err);
    }

    const col = conn.collection(collection);

    try {
      const filterDoc     = parseJson(filter, "filter");
      const projectionDoc = parseJson(projection, "projection");
      const sortDoc       = parseJson(sort, "sort");
      const updateDoc     = parseJson(update, "update");

      if (operation === "find") {
        let q = col.find(filterDoc, { projection: projectionDoc || undefined });
        if (Object.keys(sortDoc).length) q = q.sort(sortDoc);
        q = q.skip(Number(skip)).limit(Number(limit));
        const docs = await q.toArray();
        return { documents: docs, count: docs.length, collection };
      }

      if (operation === "findOne") {
        const doc = await col.findOne(filterDoc, { projection: projectionDoc || undefined });
        return { document: doc, found: !!doc, collection };
      }

      if (operation === "insertOne") {
        const payload = parseJson(document, "document");
        const result  = await col.insertOne(payload);
        return { insertedId: result.insertedId, acknowledged: result.acknowledged, collection };
      }

      if (operation === "insertMany") {
        let payload = documents;
        if (typeof payload === "string") { try { payload = JSON.parse(payload); } catch { throw new Error("MongoDB: Invalid JSON for 'documents'."); } }
        if (!Array.isArray(payload)) throw new Error("MongoDB: 'documents' must be a JSON array.");
        const result = await col.insertMany(payload);
        return { insertedCount: result.insertedCount, acknowledged: result.acknowledged, collection };
      }

      if (operation === "updateOne") {
        const opts = { upsert: upsert === true || upsert === "true" };
        if (arrayFilters) { try { opts.arrayFilters = JSON.parse(arrayFilters); } catch {} }
        const result = await col.updateOne(filterDoc, updateDoc, opts);
        return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, upsertedId: result.upsertedId, collection };
      }

      if (operation === "updateMany") {
        const result = await col.updateMany(filterDoc, updateDoc, { upsert: upsert === true || upsert === "true" });
        return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, collection };
      }

      if (operation === "deleteOne") {
        const result = await col.deleteOne(filterDoc);
        return { deletedCount: result.deletedCount, collection };
      }

      if (operation === "deleteMany") {
        const result = await col.deleteMany(filterDoc);
        return { deletedCount: result.deletedCount, collection };
      }

      if (operation === "countDocuments") {
        const count = await col.countDocuments(filterDoc);
        return { count, collection };
      }

      if (operation === "aggregate") {
        let pipe = pipeline;
        if (typeof pipe === "string") { try { pipe = JSON.parse(pipe); } catch { throw new Error("MongoDB: Invalid JSON for 'pipeline'."); } }
        if (!Array.isArray(pipe)) throw new Error("MongoDB: 'pipeline' must be a JSON array.");
        const docs = await col.aggregate(pipe).toArray();
        return { documents: docs, count: docs.length, collection };
      }

      throw new Error(`MongoDB: Unknown operation '${operation}'.`);
    } catch (err) {
      handleError(err);
    }
  },
};
