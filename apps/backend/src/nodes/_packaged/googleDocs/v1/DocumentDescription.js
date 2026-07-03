/**
 * GOOGLE DOCS — Document resource. read/create/append preserved verbatim from
 * the monolith; get, updateText, insertText, replaceText, deleteRange, list,
 * batchUpdate added for parity. Handlers receive (config, client).
 */
import { extractText } from "../GenericFunctions.js";

function requireDoc(config, op) {
  if (config.docId) return null;
  return { success: false, error: `google_docs ${op}: 'docId' is required.`, skipped: true };
}

async function opRead(config, client) {
  if (!config.docId) return { success: false, error: "google_docs: 'docId' is required.", skipped: true };
  const res = await client.get(`${client.DOCS}/${config.docId}`);
  return { docId: config.docId, title: res.data.title, text: extractText(res.data.body?.content), content: res.data.body };
}

async function opCreate(config, client) {
  const res = await client.post(client.DOCS, { title: config.title || "New Document" });
  return { docId: res.data.documentId, title: res.data.title, url: `https://docs.google.com/document/d/${res.data.documentId}` };
}

async function opAppend(config, client) {
  if (!config.docId) return { success: false, error: "google_docs: 'docId' is required.", skipped: true };
  const text = config.text || "";
  const res = await client.post(`${client.DOCS}/${config.docId}:batchUpdate`, {
    requests: [{ insertText: { location: { index: 1 }, text } }],
  });
  return { docId: config.docId, revised: res.data.documentId };
}

async function opGet(config, client) {
  const miss = requireDoc(config, "get"); if (miss) return miss;
  const res = await client.get(`${client.DOCS}/${config.docId}`);
  return { docId: res.data.documentId, title: res.data.title, revisionId: res.data.revisionId };
}

async function opInsertText(config, client) {
  const miss = requireDoc(config, "insertText"); if (miss) return miss;
  const index = typeof config.index === "number" ? config.index : 1;
  const res = await client.post(`${client.DOCS}/${config.docId}:batchUpdate`, {
    requests: [{ insertText: { location: { index }, text: config.text || "" } }],
  });
  return { docId: config.docId, revised: res.data.documentId };
}

async function opReplaceText(config, client) {
  const miss = requireDoc(config, "replaceText"); if (miss) return miss;
  if (!config.find) return { success: false, error: "google_docs replaceText: 'find' is required.", skipped: true };
  const res = await client.post(`${client.DOCS}/${config.docId}:batchUpdate`, {
    requests: [{ replaceAllText: { containsText: { text: config.find, matchCase: !!config.matchCase }, replaceText: config.replace ?? "" } }],
  });
  const replies = res.data.replies || [];
  return { docId: config.docId, occurrencesChanged: replies[0]?.replaceAllText?.occurrencesChanged || 0 };
}

async function opDeleteRange(config, client) {
  const miss = requireDoc(config, "deleteRange"); if (miss) return miss;
  if (typeof config.startIndex !== "number" || typeof config.endIndex !== "number") {
    return { success: false, error: "google_docs deleteRange: 'startIndex' and 'endIndex' are required.", skipped: true };
  }
  const res = await client.post(`${client.DOCS}/${config.docId}:batchUpdate`, {
    requests: [{ deleteContentRange: { range: { startIndex: config.startIndex, endIndex: config.endIndex } } }],
  });
  return { docId: config.docId, revised: res.data.documentId };
}

async function opUpdateTitle(config, client) {
  const miss = requireDoc(config, "updateTitle"); if (miss) return miss;
  if (!config.title) return { success: false, error: "google_docs updateTitle: 'title' is required.", skipped: true };
  const res = await client.post(`${client.DRIVE}/${config.docId}`, { name: config.title }, { supportsAllDrives: true });
  return { docId: config.docId, title: res.data.name };
}

async function opList(config, client) {
  const params = {
    q: `mimeType='application/vnd.google-apps.document'${config.query ? ` and ${config.query}` : ""}`,
    pageSize: config.limit || 20,
    fields: "files(id,name,modifiedTime,webViewLink)",
    orderBy: config.orderBy || "modifiedTime desc",
  };
  const res = await client.get(client.DRIVE, params);
  return { documents: (res.data.files || []).map((f) => ({ docId: f.id, title: f.name, modifiedTime: f.modifiedTime, url: f.webViewLink })), count: (res.data.files || []).length };
}

async function opBatchUpdate(config, client) {
  const miss = requireDoc(config, "batchUpdate"); if (miss) return miss;
  const requests = Array.isArray(config.requests) ? config.requests : [];
  if (!requests.length) return { success: false, error: "google_docs batchUpdate: 'requests' array is required.", skipped: true };
  const res = await client.post(`${client.DOCS}/${config.docId}:batchUpdate`, { requests });
  return { docId: config.docId, replies: res.data.replies || [], revised: res.data.documentId };
}

export const documentOperations = {
  read: opRead,
  create: opCreate,
  append: opAppend,
  get: opGet,
  insertText: opInsertText,
  replaceText: opReplaceText,
  deleteRange: opDeleteRange,
  updateTitle: opUpdateTitle,
  list: opList,
  batchUpdate: opBatchUpdate,
};
