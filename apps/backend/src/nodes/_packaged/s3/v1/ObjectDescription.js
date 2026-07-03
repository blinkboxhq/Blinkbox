/**
 * S3 — Object resource. list / get / put / delete / presign / exists preserved
 * verbatim from the monolith; copyObject, getObjectMeta (HEAD), deleteObjects
 * (batch), getObjectTagging and putObjectTagging added for parity. Handlers
 * receive (config, ctx) where ctx carries the resolved creds, region, bucket,
 * base URL, customEndpoint and the node input.
 */
import axios from "axios";
import { signRequest, buildPresignedUrl, xmlValues, num } from "../GenericFunctions.js";

async function opListObjects(config, ctx) {
  const { accessKey, secretKey, region, bucket, base } = ctx;
  const prefix = config.prefix || "";
  const maxKeys = num(config.limit, 100);
  const url = `${base}/?list-type=2&prefix=${encodeURIComponent(prefix)}&max-keys=${maxKeys}`;
  const signed = signRequest("GET", url, {}, "", accessKey, secretKey, region);
  const { data } = await axios.get(url, { headers: signed, timeout: 15000 });
  const keys  = xmlValues(data, "Key");
  const sizes = xmlValues(data, "Size");
  const dates = xmlValues(data, "LastModified");
  const objects = keys.map((k, i) => ({ key: k, size: sizes[i] ? Number(sizes[i]) : undefined, lastModified: dates[i] }));
  return { objects, count: objects.length, bucket, prefix };
}

async function opGetObject(config, ctx) {
  const { accessKey, secretKey, region, bucket, base, input } = ctx;
  const key = config.key || input?.key || "";
  if (!key) return { success: false, error: "S3 getObject: 'key' is required.", skipped: true };
  const url = `${base}/${encodeURIComponent(key)}`;
  const signed = signRequest("GET", url, {}, "", accessKey, secretKey, region);
  const { data, headers: resHeaders } = await axios.get(url, { headers: signed, timeout: 30000, responseType: "text" });
  return { content: data, key, bucket, contentType: resHeaders["content-type"], contentLength: resHeaders["content-length"] };
}

async function opPutObject(config, ctx) {
  const { accessKey, secretKey, region, bucket, base, customEndpoint, input } = ctx;
  const key = config.key || input?.key || "";
  const content = config.content ?? input?.content ?? "";
  if (!key) return { success: false, error: "S3 putObject: 'key' is required.", skipped: true };
  const url = `${base}/${encodeURIComponent(key)}`;
  const contentType = config.contentType || "text/plain";
  const acl = config.acl || "private";
  const extraHeaders = { "content-type": contentType, "x-amz-acl": acl };
  const signed = signRequest("PUT", url, extraHeaders, content, accessKey, secretKey, region);
  await axios.put(url, content, { headers: signed, timeout: 30000 });
  const publicUrl = customEndpoint
    ? `${customEndpoint}/${bucket}/${key}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  return { success: true, key, bucket, url: publicUrl, acl };
}

async function opDeleteObject(config, ctx) {
  const { accessKey, secretKey, region, bucket, base, input } = ctx;
  const key = config.key || input?.key || "";
  if (!key) return { success: false, error: "S3 deleteObject: 'key' is required.", skipped: true };
  const url = `${base}/${encodeURIComponent(key)}`;
  const signed = signRequest("DELETE", url, {}, "", accessKey, secretKey, region);
  await axios.delete(url, { headers: signed, timeout: 15000 });
  return { success: true, deleted: true, key, bucket };
}

async function opGeneratePresignedUrl(config, ctx) {
  const { accessKey, secretKey, region, bucket, base, input } = ctx;
  const key = config.key || input?.key || "";
  const expiresIn = num(config.presignExpiry ?? config.expiresIn, 3600);
  const method = (config.presignMethod || "GET").toUpperCase();
  if (!key) return { success: false, error: "S3 generatePresignedUrl: 'key' is required.", skipped: true };
  const rawUrl = `${base}/${encodeURIComponent(key)}`;
  const presignedUrl = buildPresignedUrl(method, rawUrl, accessKey, secretKey, region, expiresIn);
  return { url: presignedUrl, key, bucket, method, expiresIn };
}

async function opExists(config, ctx) {
  const { accessKey, secretKey, region, bucket, base, input } = ctx;
  const key = config.key || input?.key || "";
  if (!key) return { success: false, error: "S3 exists: 'key' is required.", skipped: true };
  const url = `${base}/${encodeURIComponent(key)}`;
  const signed = signRequest("HEAD", url, {}, "", accessKey, secretKey, region);
  try {
    const { headers: resHeaders } = await axios.head(url, { headers: signed, timeout: 10000 });
    return { exists: true, key, bucket, size: resHeaders["content-length"] ? Number(resHeaders["content-length"]) : undefined, contentType: resHeaders["content-type"] };
  } catch (e) {
    if (e.response?.status === 404) return { exists: false, key, bucket };
    throw e;
  }
}

async function opGetObjectMeta(config, ctx) {
  const { accessKey, secretKey, region, bucket, base, input } = ctx;
  const key = config.key || input?.key || "";
  if (!key) return { success: false, error: "S3 getObjectMeta: 'key' is required.", skipped: true };
  const url = `${base}/${encodeURIComponent(key)}`;
  const signed = signRequest("HEAD", url, {}, "", accessKey, secretKey, region);
  const { headers: h } = await axios.head(url, { headers: signed, timeout: 10000 });
  return {
    success: true, key, bucket,
    contentType: h["content-type"],
    contentLength: h["content-length"] ? Number(h["content-length"]) : undefined,
    etag: h.etag,
    lastModified: h["last-modified"],
    storageClass: h["x-amz-storage-class"],
  };
}

async function opCopyObject(config, ctx) {
  const { accessKey, secretKey, region, bucket, base } = ctx;
  const { sourceBucket, sourceKey, key } = config;
  if (!sourceKey) return { success: false, error: "S3 copyObject: 'sourceKey' is required.", skipped: true };
  if (!key) return { success: false, error: "S3 copyObject: 'key' (destination) is required.", skipped: true };
  const src = `/${sourceBucket || bucket}/${sourceKey}`;
  const url = `${base}/${encodeURIComponent(key)}`;
  const extraHeaders = { "x-amz-copy-source": src };
  const signed = signRequest("PUT", url, extraHeaders, "", accessKey, secretKey, region);
  const { data } = await axios.put(url, "", { headers: signed, timeout: 30000, responseType: "text" });
  return { success: true, key, bucket, copiedFrom: src, etag: xmlValues(data, "ETag")[0] };
}

async function opDeleteObjects(config, ctx) {
  const { accessKey, secretKey, region, bucket, base } = ctx;
  const keys = Array.isArray(config.keys)
    ? config.keys
    : String(config.keys || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!keys.length) return { success: false, error: "S3 deleteObjects: 'keys' is required.", skipped: true };
  const body = `<?xml version="1.0" encoding="UTF-8"?><Delete>${keys.map((k) => `<Object><Key>${k}</Key></Object>`).join("")}<Quiet>true</Quiet></Delete>`;
  const md5 = (await import("crypto")).createHash("md5").update(body).digest("base64");
  const url = `${base}/?delete`;
  const extraHeaders = { "content-md5": md5, "content-type": "application/xml" };
  const signed = signRequest("POST", url, extraHeaders, body, accessKey, secretKey, region);
  const { data } = await axios.post(url, body, { headers: signed, timeout: 30000, responseType: "text" });
  const errored = xmlValues(data, "Error");
  return { success: true, bucket, deletedCount: keys.length - errored.length, requested: keys.length };
}

async function opGetObjectTagging(config, ctx) {
  const { accessKey, secretKey, region, bucket, base, input } = ctx;
  const key = config.key || input?.key || "";
  if (!key) return { success: false, error: "S3 getObjectTagging: 'key' is required.", skipped: true };
  const url = `${base}/${encodeURIComponent(key)}?tagging`;
  const signed = signRequest("GET", url, {}, "", accessKey, secretKey, region);
  const { data } = await axios.get(url, { headers: signed, timeout: 15000, responseType: "text" });
  const kk = xmlValues(data, "Key");
  const vv = xmlValues(data, "Value");
  const tags = kk.map((k, i) => ({ key: k, value: vv[i] }));
  return { success: true, key, bucket, tags };
}

async function opPutObjectTagging(config, ctx) {
  const { accessKey, secretKey, region, bucket, base, input } = ctx;
  const key = config.key || input?.key || "";
  if (!key) return { success: false, error: "S3 putObjectTagging: 'key' is required.", skipped: true };
  const tagsObj = config.tags && typeof config.tags === "object" && !Array.isArray(config.tags) ? config.tags : {};
  const entries = Object.entries(tagsObj);
  if (!entries.length) return { success: false, error: "S3 putObjectTagging: 'tags' object is required.", skipped: true };
  const body = `<?xml version="1.0" encoding="UTF-8"?><Tagging><TagSet>${entries.map(([k, v]) => `<Tag><Key>${k}</Key><Value>${v}</Value></Tag>`).join("")}</TagSet></Tagging>`;
  const md5 = (await import("crypto")).createHash("md5").update(body).digest("base64");
  const url = `${base}/${encodeURIComponent(key)}?tagging`;
  const extraHeaders = { "content-md5": md5, "content-type": "application/xml" };
  const signed = signRequest("PUT", url, extraHeaders, body, accessKey, secretKey, region);
  await axios.put(url, body, { headers: signed, timeout: 15000 });
  return { success: true, key, bucket, tagCount: entries.length };
}

export const objectOperations = {
  listObjects: opListObjects,
  getObject: opGetObject,
  putObject: opPutObject,
  deleteObject: opDeleteObject,
  deleteObjects: opDeleteObjects,
  generatePresignedUrl: opGeneratePresignedUrl,
  exists: opExists,
  getObjectMeta: opGetObjectMeta,
  copyObject: opCopyObject,
  getObjectTagging: opGetObjectTagging,
  putObjectTagging: opPutObjectTagging,
};
