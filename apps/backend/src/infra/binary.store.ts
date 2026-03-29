/**
 * Binary Store — S3-Compatible Object Storage for File Outputs
 *
 * HTTP responses that carry binary data (images, PDFs, archives, etc.)
 * are streamed directly here instead of being JSON-serialized into
 * Temporal state or the payload vault.
 *
 * Storage backends:
 *   - Production: S3-compatible bucket (AWS S3, MinIO, R2, etc.)
 *     Set BINARY_STORE_BUCKET + standard AWS env vars.
 *   - Development: Local disk (./data/binaries/)
 *     Automatic when BINARY_STORE_BUCKET is not set.
 *
 * Each file is stored with a unique key:
 *   bb/<workflowId>/<nodeId>/<fileId>.<ext>
 *
 * The returned BinaryMetadata pointer is tiny (JSON-safe) and flows
 * through Temporal state and the payload vault without bloating them.
 */

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

// ── Configuration ─────────────────────────────────────────────────────────────

const BUCKET = process.env.BINARY_STORE_BUCKET || "";
const REGION = process.env.AWS_REGION || "us-east-1";
const LOCAL_DIR = process.env.BINARY_STORE_LOCAL_DIR || "./data/binaries";

// Lazy-loaded S3 client (only when bucket is configured)
let s3Client: any = null;

async function getS3Client() {
  if (s3Client) return s3Client;
  // Dynamic import — @aws-sdk/client-s3 is only needed in production
  const { S3Client } = await import("@aws-sdk/client-s3");
  s3Client = new S3Client({
    region: REGION,
    ...(process.env.AWS_ENDPOINT_URL
      ? { endpoint: process.env.AWS_ENDPOINT_URL, forcePathStyle: true }
      : {}),
  });
  return s3Client;
}

// ── Binary Metadata (the pointer that flows through the DAG) ──────────────────

export interface BinaryMetadata {
  type: "binary";
  fileId: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
  storageKey: string;
  storedAt: string; // "s3" | "local"
}

// ── MIME Detection ───────���────────────────────────────────────────────────────

/** MIME types that indicate binary (non-text) content. */
const BINARY_MIME_PREFIXES = [
  "image/",
  "audio/",
  "video/",
  "application/pdf",
  "application/zip",
  "application/gzip",
  "application/x-tar",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
  "application/octet-stream",
  "application/vnd.",        // Office docs, spreadsheets, etc.
  "application/x-protobuf",
  "font/",
];

/** Content types that should be treated as text even though they start with application/ */
const TEXT_MIME_PATTERNS = [
  "application/json",
  "application/xml",
  "application/javascript",
  "application/x-www-form-urlencoded",
  "text/",
];

/**
 * Returns true if the Content-Type header indicates binary data.
 */
export function isBinaryContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  const lower = contentType.toLowerCase().split(";")[0].trim();

  // Explicit text types — never treat as binary
  for (const pattern of TEXT_MIME_PATTERNS) {
    if (lower.startsWith(pattern)) return false;
  }

  // Known binary prefixes
  for (const prefix of BINARY_MIME_PREFIXES) {
    if (lower.startsWith(prefix)) return true;
  }

  return false;
}

/**
 * Guess a file extension from a MIME type.
 */
function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
    "application/zip": "zip",
    "application/gzip": "gz",
    "audio/mpeg": "mp3",
    "video/mp4": "mp4",
  };
  const clean = mime.toLowerCase().split(";")[0].trim();
  return map[clean] || clean.split("/").pop() || "bin";
}

/**
 * Extract a filename from Content-Disposition header, or generate one.
 */
function resolveFileName(
  headers: Record<string, string>,
  mimeType: string,
  fileId: string,
): string {
  const disposition = headers["content-disposition"] || "";
  const match = disposition.match(/filename[*]?=(?:UTF-8''|"?)([^";]+)/i);
  if (match) return match[1].trim().replace(/"/g, "");
  return `${fileId}.${extFromMime(mimeType)}`;
}

// ── Store Operations ────���─────────────────────────────────────────────────────

/**
 * Store a binary buffer and return a metadata pointer.
 */
export async function storeBinary(
  workflowId: string,
  nodeId: string,
  buffer: Buffer,
  mimeType: string,
  responseHeaders: Record<string, string>,
): Promise<BinaryMetadata> {
  const fileId = `bf_${crypto.randomUUID()}`;
  const fileName = resolveFileName(responseHeaders, mimeType, fileId);
  const ext = extFromMime(mimeType);
  const storageKey = `bb/${workflowId}/${nodeId}/${fileId}.${ext}`;

  if (BUCKET) {
    await storeToS3(storageKey, buffer, mimeType);
  } else {
    await storeToLocal(storageKey, buffer);
  }

  return {
    type: "binary",
    fileId,
    mimeType,
    fileName,
    fileSize: buffer.length,
    storageKey,
    storedAt: BUCKET ? "s3" : "local",
  };
}

/**
 * Retrieve a binary file by its storage key.
 */
export async function retrieveBinary(
  storageKey: string,
  storedAt: string,
): Promise<Buffer> {
  if (storedAt === "s3") {
    return retrieveFromS3(storageKey);
  }
  return retrieveFromLocal(storageKey);
}

/**
 * Delete all binary files for a workflow.
 */
export async function cleanupWorkflowBinaries(
  workflowId: string,
): Promise<number> {
  const prefix = `bb/${workflowId}/`;

  if (BUCKET) {
    return cleanupS3Prefix(prefix);
  }
  return cleanupLocalPrefix(prefix);
}

// ── S3 Backend ──────────���─────────────────────────────────────────────────────

async function storeToS3(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const client = await getS3Client();
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}

async function retrieveFromS3(key: string): Promise<Buffer> {
  const client = await getS3Client();
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const response = await client.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
  );
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function cleanupS3Prefix(prefix: string): Promise<number> {
  const client = await getS3Client();
  const { ListObjectsV2Command, DeleteObjectsCommand } = await import(
    "@aws-sdk/client-s3"
  );

  let deleted = 0;
  let continuationToken: string | undefined;

  do {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const objects = list.Contents ?? [];
    if (objects.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET,
          Delete: { Objects: objects.map((o: any) => ({ Key: o.Key })) },
        }),
      );
      deleted += objects.length;
    }

    continuationToken = list.IsTruncated
      ? list.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return deleted;
}

// ── Local Disk Backend ────��───────────────────────────────────────────────────

async function storeToLocal(key: string, buffer: Buffer): Promise<void> {
  const filePath = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
}

async function retrieveFromLocal(key: string): Promise<Buffer> {
  const filePath = path.join(LOCAL_DIR, key);
  return fs.readFile(filePath);
}

async function cleanupLocalPrefix(prefix: string): Promise<number> {
  const dirPath = path.join(LOCAL_DIR, prefix);
  try {
    const entries = await fs.readdir(dirPath, { recursive: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, String(entry));
      const stat = await fs.stat(fullPath);
      if (stat.isFile()) await fs.unlink(fullPath);
    }
    // Remove the workflow directory itself
    await fs.rm(dirPath, { recursive: true, force: true });
    return entries.length;
  } catch (err: any) {
    if (err.code === "ENOENT") return 0;
    throw err;
  }
}

// ── Binary Ref Check (pure — safe for Temporal workflows) ─────────────────────

/**
 * Check if a value is a binary metadata pointer.
 */
export function isBinaryRef(value: unknown): value is BinaryMetadata {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).type === "binary" &&
    typeof (value as Record<string, unknown>).fileId === "string" &&
    typeof (value as Record<string, unknown>).storageKey === "string"
  );
}
