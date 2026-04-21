import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const BUCKET = process.env.BINARY_STORE_BUCKET || "";
const REGION = process.env.AWS_REGION || "us-east-1";
const LOCAL_DIR = process.env.BINARY_STORE_LOCAL_DIR || "./data/binaries";

let s3Client = null;

async function getS3Client() {
  if (s3Client) return s3Client;
  const { S3Client } = await import("@aws-sdk/client-s3");
  s3Client = new S3Client({
    region: REGION,
    ...(process.env.AWS_ENDPOINT_URL
      ? { endpoint: process.env.AWS_ENDPOINT_URL, forcePathStyle: true }
      : {}),
  });
  return s3Client;
}

const BINARY_MIME_PREFIXES = [
  "image/", "audio/", "video/",
  "application/pdf", "application/zip", "application/gzip",
  "application/x-tar", "application/x-7z-compressed",
  "application/x-rar-compressed", "application/octet-stream",
  "application/vnd.", "application/x-protobuf", "font/",
];

const TEXT_MIME_PATTERNS = [
  "application/json", "application/xml", "application/javascript",
  "application/x-www-form-urlencoded", "text/",
];

export function isBinaryContentType(contentType) {
  if (!contentType) return false;
  const lower = contentType.toLowerCase().split(";")[0].trim();
  for (const p of TEXT_MIME_PATTERNS) { if (lower.startsWith(p)) return false; }
  for (const p of BINARY_MIME_PREFIXES) { if (lower.startsWith(p)) return true; }
  return false;
}

function extFromMime(mime) {
  const map = {
    "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif",
    "image/webp": "webp", "image/svg+xml": "svg", "application/pdf": "pdf",
    "application/zip": "zip", "application/gzip": "gz",
    "audio/mpeg": "mp3", "video/mp4": "mp4",
  };
  const clean = mime.toLowerCase().split(";")[0].trim();
  return map[clean] || clean.split("/").pop() || "bin";
}

function resolveFileName(headers, mimeType, fileId) {
  const disposition = headers["content-disposition"] || "";
  const match = disposition.match(/filename[*]?=(?:UTF-8''|"?)([^";]+)/i);
  if (match) return match[1].trim().replace(/"/g, "");
  return `${fileId}.${extFromMime(mimeType)}`;
}

export async function storeBinary(workflowId, nodeId, buffer, mimeType, responseHeaders) {
  const fileId = `bf_${crypto.randomUUID()}`;
  const fileName = resolveFileName(responseHeaders, mimeType, fileId);
  const ext = extFromMime(mimeType);
  const storageKey = `bb/${workflowId}/${nodeId}/${fileId}.${ext}`;

  if (BUCKET) {
    await storeToS3(storageKey, buffer, mimeType);
  } else {
    await storeToLocal(storageKey, buffer);
  }

  return { type: "binary", fileId, mimeType, fileName, fileSize: buffer.length, storageKey, storedAt: BUCKET ? "s3" : "local" };
}

export async function retrieveBinary(storageKey, storedAt) {
  return storedAt === "s3" ? retrieveFromS3(storageKey) : retrieveFromLocal(storageKey);
}

export async function cleanupWorkflowBinaries(workflowId) {
  const prefix = `bb/${workflowId}/`;
  return BUCKET ? cleanupS3Prefix(prefix) : cleanupLocalPrefix(prefix);
}

async function storeToS3(key, buffer, contentType) {
  const client = await getS3Client();
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType }));
}

async function retrieveFromS3(key) {
  const client = await getS3Client();
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const response = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks = [];
  for await (const chunk of response.Body) { chunks.push(chunk); }
  return Buffer.concat(chunks);
}

async function cleanupS3Prefix(prefix) {
  const client = await getS3Client();
  const { ListObjectsV2Command, DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
  let deleted = 0, continuationToken;
  do {
    const list = await client.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: continuationToken }));
    const objects = list.Contents ?? [];
    if (objects.length > 0) {
      await client.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: objects.map((o) => ({ Key: o.Key })) } }));
      deleted += objects.length;
    }
    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);
  return deleted;
}

async function storeToLocal(key, buffer) {
  const filePath = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
}

async function retrieveFromLocal(key) {
  return fs.readFile(path.join(LOCAL_DIR, key));
}

async function cleanupLocalPrefix(prefix) {
  const dirPath = path.join(LOCAL_DIR, prefix);
  try {
    const entries = await fs.readdir(dirPath, { recursive: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, String(entry));
      const stat = await fs.stat(fullPath);
      if (stat.isFile()) await fs.unlink(fullPath);
    }
    await fs.rm(dirPath, { recursive: true, force: true });
    return entries.length;
  } catch (err) {
    if (err.code === "ENOENT") return 0;
    throw err;
  }
}

export function isBinaryRef(value) {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    value.type === "binary" && typeof value.fileId === "string" && typeof value.storageKey === "string";
}
