/**
 * MONGODB — Query & Read resource. find / findOne / countDocuments / aggregate
 * preserved verbatim from the monolith; distinct, findOneAndUpdate,
 * findOneAndDelete, estimatedDocumentCount, listCollections added for parity.
 * Handlers receive (config, ctx) where ctx is
 * { col, collection, filterDoc, projectionDoc, sortDoc, updateDoc }.
 */
import { parseJson } from "../GenericFunctions.js";

async function opFind(config, { col, collection, filterDoc, projectionDoc, sortDoc }) {
  const { limit = 100, skip = 0 } = config;
  let q = col.find(filterDoc, { projection: projectionDoc || undefined });
  if (Object.keys(sortDoc).length) q = q.sort(sortDoc);
  q = q.skip(Number(skip)).limit(Number(limit));
  const docs = await q.toArray();
  return { documents: docs, count: docs.length, collection };
}

async function opFindOne(config, { col, collection, filterDoc, projectionDoc }) {
  const doc = await col.findOne(filterDoc, { projection: projectionDoc || undefined });
  return { document: doc, found: !!doc, collection };
}

async function opCountDocuments(config, { col, collection, filterDoc }) {
  const count = await col.countDocuments(filterDoc);
  return { count, collection };
}

async function opAggregate(config, { col, collection }) {
  let pipe = config.pipeline;
  if (typeof pipe === "string") { try { pipe = JSON.parse(pipe); } catch { throw new Error("MongoDB: Invalid JSON for 'pipeline'."); } }
  if (!Array.isArray(pipe)) throw new Error("MongoDB: 'pipeline' must be a JSON array.");
  const docs = await col.aggregate(pipe).toArray();
  return { documents: docs, count: docs.length, collection };
}

async function opDistinct(config, { col, collection, filterDoc }) {
  const field = config.field;
  if (!field) return { success: false, error: "MongoDB: 'field' is required for distinct.", skipped: true };
  const values = await col.distinct(field, filterDoc);
  return { values, count: values.length, field, collection };
}

async function opFindOneAndUpdate(config, { col, collection, filterDoc, updateDoc, projectionDoc, sortDoc }) {
  const opts = {
    upsert: config.upsert === true || config.upsert === "true",
    returnDocument: config.returnDocument === "before" ? "before" : "after",
  };
  if (projectionDoc && Object.keys(projectionDoc).length) opts.projection = projectionDoc;
  if (sortDoc && Object.keys(sortDoc).length) opts.sort = sortDoc;
  const doc = await col.findOneAndUpdate(filterDoc, updateDoc, opts);
  return { document: doc, collection };
}

async function opFindOneAndDelete(config, { col, collection, filterDoc, projectionDoc, sortDoc }) {
  const opts = {};
  if (projectionDoc && Object.keys(projectionDoc).length) opts.projection = projectionDoc;
  if (sortDoc && Object.keys(sortDoc).length) opts.sort = sortDoc;
  const doc = await col.findOneAndDelete(filterDoc, opts);
  return { document: doc, collection };
}

async function opEstimatedDocumentCount(config, { col, collection }) {
  const count = await col.estimatedDocumentCount();
  return { count, collection };
}

async function opListCollections(config, { conn }) {
  const cols = await conn.db.listCollections().toArray();
  return { collections: cols.map((c) => c.name), count: cols.length };
}

export const queryOperations = {
  find: opFind,
  findOne: opFindOne,
  countDocuments: opCountDocuments,
  aggregate: opAggregate,
  distinct: opDistinct,
  findOneAndUpdate: opFindOneAndUpdate,
  findOneAndDelete: opFindOneAndDelete,
  estimatedDocumentCount: opEstimatedDocumentCount,
  listCollections: opListCollections,
};
