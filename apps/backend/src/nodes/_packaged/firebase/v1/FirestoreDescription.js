/**
 * FIREBASE — Firestore resource. get / set / add / update / delete /
 * queryCollection preserved verbatim from the monolith; incrementField,
 * batchSet, listCollections and countCollection added for parity. Handlers
 * receive (config, { db }).
 */
import { parseJson, num } from "../GenericFunctions.js";

async function opGetDocument(config, { db }) {
  const { collection, docId } = config;
  if (!collection || !docId) return { success: false, error: "Firebase: 'collection' and 'docId' are required.", skipped: true };
  const snap = await db.collection(collection).doc(docId).get();
  return { document: snap.exists ? { id: snap.id, ...snap.data() } : null, found: snap.exists, collection, docId };
}

async function opSetDocument(config, { db }) {
  const { collection, docId } = config;
  if (!collection || !docId) return { success: false, error: "Firebase: 'collection' and 'docId' are required.", skipped: true };
  const payload = parseJson(config.data, "data");
  await db.collection(collection).doc(docId).set(payload, { merge: config.merge === true });
  return { set: true, collection, docId };
}

async function opAddDocument(config, { db }) {
  const { collection } = config;
  if (!collection) return { success: false, error: "Firebase: 'collection' is required.", skipped: true };
  const payload = parseJson(config.data, "data");
  const ref = await db.collection(collection).add(payload);
  return { docId: ref.id, collection, added: true };
}

async function opUpdateDocument(config, { db }) {
  const { collection, docId } = config;
  if (!collection || !docId) return { success: false, error: "Firebase: 'collection' and 'docId' are required.", skipped: true };
  const payload = parseJson(config.updateData ?? config.data, "updateData");
  await db.collection(collection).doc(docId).update(payload);
  return { updated: true, collection, docId };
}

async function opDeleteDocument(config, { db }) {
  const { collection, docId } = config;
  if (!collection || !docId) return { success: false, error: "Firebase: 'collection' and 'docId' are required.", skipped: true };
  await db.collection(collection).doc(docId).delete();
  return { deleted: true, collection, docId };
}

async function opQueryCollection(config, { db }) {
  const { collection, field, operator = "==", filterValue, orderBy, orderDir = "asc", limit = 100 } = config;
  if (!collection) return { success: false, error: "Firebase: 'collection' is required.", skipped: true };
  let q = db.collection(collection);
  if (field && filterValue !== undefined) q = q.where(field, operator, filterValue);
  if (orderBy) q = q.orderBy(orderBy, orderDir);
  q = q.limit(num(limit, 100));
  const snap = await q.get();
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { documents: docs, count: docs.length, collection };
}

async function opIncrementField(config, { db }) {
  const { collection, docId, field } = config;
  if (!collection || !docId || !field) return { success: false, error: "Firebase incrementField: 'collection', 'docId' and 'field' are required.", skipped: true };
  const admin = (await import("firebase-admin")).default;
  const by = Number(config.by) || 1;
  await db.collection(collection).doc(docId).update({ [field]: admin.firestore.FieldValue.increment(by) });
  return { incremented: true, collection, docId, field, by };
}

async function opBatchSet(config, { db }) {
  const { collection } = config;
  if (!collection) return { success: false, error: "Firebase batchSet: 'collection' is required.", skipped: true };
  const rows = parseJson(config.documents, "documents");
  if (!Array.isArray(rows) || !rows.length) return { success: false, error: "Firebase batchSet: 'documents' must be a non-empty JSON array.", skipped: true };
  const batch = db.batch();
  const ids = [];
  for (const row of rows) {
    const id = row.id || db.collection(collection).doc().id;
    const { id: _drop, ...body } = row;
    batch.set(db.collection(collection).doc(id), body, { merge: config.merge === true });
    ids.push(id);
  }
  await batch.commit();
  return { committed: true, collection, count: ids.length, ids };
}

async function opListCollections(_config, { db }) {
  const cols = await db.listCollections();
  return { collections: cols.map((c) => c.id), count: cols.length };
}

async function opCountCollection(config, { db }) {
  const { collection } = config;
  if (!collection) return { success: false, error: "Firebase countCollection: 'collection' is required.", skipped: true };
  let q = db.collection(collection);
  if (config.field && config.filterValue !== undefined) q = q.where(config.field, config.operator || "==", config.filterValue);
  const agg = await q.count().get();
  return { collection, count: agg.data().count };
}

export const firestoreOperations = {
  getDocument: opGetDocument,
  setDocument: opSetDocument,
  addDocument: opAddDocument,
  updateDocument: opUpdateDocument,
  deleteDocument: opDeleteDocument,
  queryCollection: opQueryCollection,
  incrementField: opIncrementField,
  batchSet: opBatchSet,
  listCollections: opListCollections,
  countCollection: opCountCollection,
};
