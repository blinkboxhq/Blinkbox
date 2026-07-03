/**
 * MONGODB — Write & Index resource. insertOne / insertMany / updateOne /
 * updateMany / deleteOne / deleteMany preserved verbatim from the monolith;
 * replaceOne, bulkWrite, createIndex, listIndexes, dropIndex added for parity.
 * Handlers receive (config, ctx) where ctx is
 * { col, collection, filterDoc, projectionDoc, sortDoc, updateDoc }.
 */
import { parseJson } from "../GenericFunctions.js";

async function opInsertOne(config, { col, collection }) {
  const payload = parseJson(config.document, "document");
  const result = await col.insertOne(payload);
  return { insertedId: result.insertedId, acknowledged: result.acknowledged, collection };
}

async function opInsertMany(config, { col, collection }) {
  let payload = config.documents;
  if (typeof payload === "string") { try { payload = JSON.parse(payload); } catch { throw new Error("MongoDB: Invalid JSON for 'documents'."); } }
  if (!Array.isArray(payload)) throw new Error("MongoDB: 'documents' must be a JSON array.");
  const result = await col.insertMany(payload);
  return { insertedCount: result.insertedCount, acknowledged: result.acknowledged, collection };
}

async function opUpdateOne(config, { col, collection, filterDoc, updateDoc }) {
  const opts = { upsert: config.upsert === true || config.upsert === "true" };
  if (config.arrayFilters) { try { opts.arrayFilters = JSON.parse(config.arrayFilters); } catch {} }
  const result = await col.updateOne(filterDoc, updateDoc, opts);
  return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, upsertedId: result.upsertedId, collection };
}

async function opUpdateMany(config, { col, collection, filterDoc, updateDoc }) {
  const result = await col.updateMany(filterDoc, updateDoc, { upsert: config.upsert === true || config.upsert === "true" });
  return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, collection };
}

async function opDeleteOne(config, { col, collection, filterDoc }) {
  const result = await col.deleteOne(filterDoc);
  return { deletedCount: result.deletedCount, collection };
}

async function opDeleteMany(config, { col, collection, filterDoc }) {
  const result = await col.deleteMany(filterDoc);
  return { deletedCount: result.deletedCount, collection };
}

async function opReplaceOne(config, { col, collection, filterDoc }) {
  const replacement = parseJson(config.document, "document");
  const opts = { upsert: config.upsert === true || config.upsert === "true" };
  const result = await col.replaceOne(filterDoc, replacement, opts);
  return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, upsertedId: result.upsertedId, collection };
}

async function opBulkWrite(config, { col, collection }) {
  let ops = config.operations;
  if (typeof ops === "string") { try { ops = JSON.parse(ops); } catch { throw new Error("MongoDB: Invalid JSON for 'operations'."); } }
  if (!Array.isArray(ops) || ops.length === 0) throw new Error("MongoDB: 'operations' must be a non-empty JSON array.");
  const result = await col.bulkWrite(ops);
  return {
    insertedCount: result.insertedCount,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    deletedCount: result.deletedCount,
    upsertedCount: result.upsertedCount,
    collection,
  };
}

async function opCreateIndex(config, { col, collection }) {
  const keys = parseJson(config.keys, "keys");
  if (!keys || Object.keys(keys).length === 0) return { success: false, error: "MongoDB: 'keys' object is required for createIndex.", skipped: true };
  const opts = config.indexOptions ? parseJson(config.indexOptions, "indexOptions") : {};
  const name = await col.createIndex(keys, opts);
  return { indexName: name, collection };
}

async function opListIndexes(config, { col, collection }) {
  const indexes = await col.listIndexes().toArray();
  return { indexes, count: indexes.length, collection };
}

async function opDropIndex(config, { col, collection }) {
  const name = config.indexName;
  if (!name) return { success: false, error: "MongoDB: 'indexName' is required for dropIndex.", skipped: true };
  await col.dropIndex(name);
  return { dropped: true, indexName: name, collection };
}

export const writeOperations = {
  insertOne: opInsertOne,
  insertMany: opInsertMany,
  updateOne: opUpdateOne,
  updateMany: opUpdateMany,
  deleteOne: opDeleteOne,
  deleteMany: opDeleteMany,
  replaceOne: opReplaceOne,
  bulkWrite: opBulkWrite,
  createIndex: opCreateIndex,
  listIndexes: opListIndexes,
  dropIndex: opDropIndex,
};
