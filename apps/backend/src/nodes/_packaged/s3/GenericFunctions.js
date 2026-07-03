/**
 * S3 — shared primitives for the modular node. AWS SigV4 request signing,
 * presigned-URL construction, minimal XML extraction, credential resolution
 * (vaulted JSON credential OR inline accessKeyId/secretAccessKey), and error
 * mapping from S3's XML error bodies. Handlers receive (config, ctx) where
 * ctx = { accessKey, secretKey, region, bucket, base, customEndpoint, input }.
 *
 * Import depth: this file lives at _packaged/s3/, so utils are three levels up.
 * Production nixpacks build context is apps/backend only.
 */
import crypto from "crypto";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export function hmac(key, data, encoding) {
  return crypto.createHmac("sha256", key).update(data).digest(encoding);
}
export function sha256hex(data) {
  return crypto.createHash("sha256").update(data || "").digest("hex");
}
export function getSigningKey(secretKey, date, region, service) {
  const kDate    = hmac(`AWS4${secretKey}`, date);
  const kRegion  = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}
export function isoDate(d) { return d.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 8); }
export function isoDateTime(d) { return d.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z"; }

export function signRequest(method, url, extraHeaders, body, accessKey, secretKey, region) {
  const u = new URL(url);
  const now = new Date();
  const date = isoDate(now);
  const datetime = isoDateTime(now);
  const bodyHash = sha256hex(body);

  const headers = {
    host: u.host,
    "x-amz-date": datetime,
    "x-amz-content-sha256": bodyHash,
    ...extraHeaders,
  };

  const canonicalHeaderKeys = Object.keys(headers).map((k) => k.toLowerCase()).sort();
  const canonicalHeaders = canonicalHeaderKeys.map((k) => `${k}:${headers[k]}\n`).join("");
  const signedHeaders = canonicalHeaderKeys.join(";");

  const queryParts = [...u.searchParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const canonicalRequest = [method, u.pathname, queryParts, canonicalHeaders, signedHeaders, bodyHash].join("\n");
  const credScope = `${date}/${region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${datetime}\n${credScope}\n${sha256hex(canonicalRequest)}`;
  const sigKey = getSigningKey(secretKey, date, region, "s3");
  const signature = hmac(sigKey, stringToSign, "hex");

  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credScope},SignedHeaders=${signedHeaders},Signature=${signature}`,
  };
}

export function buildPresignedUrl(method, url, accessKey, secretKey, region, expiresIn) {
  const u = new URL(url);
  const now = new Date();
  const date = isoDate(now);
  const datetime = isoDateTime(now);
  const credScope = `${date}/${region}/s3/aws4_request`;
  const signedHeaders = "host";

  u.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
  u.searchParams.set("X-Amz-Credential", `${accessKey}/${credScope}`);
  u.searchParams.set("X-Amz-Date", datetime);
  u.searchParams.set("X-Amz-Expires", String(expiresIn));
  u.searchParams.set("X-Amz-SignedHeaders", signedHeaders);

  const queryParts = [...u.searchParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const canonicalRequest = [method, u.pathname, queryParts, `host:${u.host}\n`, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = `AWS4-HMAC-SHA256\n${datetime}\n${credScope}\n${sha256hex(canonicalRequest)}`;
  const sigKey = getSigningKey(secretKey, date, region, "s3");
  const signature = hmac(sigKey, stringToSign, "hex");

  u.searchParams.set("X-Amz-Signature", signature);
  return u.toString();
}

export function xmlValues(xml, tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "g");
  const out = [];
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

/** Aliases that map friendly op names onto their canonical handlers. */
export const OP_ALIAS = {
  upload: "putObject",
  download: "getObject",
  delete: "deleteObject",
  list: "listObjects",
  presign: "generatePresignedUrl",
};

export function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Resolve AWS credentials + region for a run. Returns
 * { accessKey, secretKey, region } or a skip object { skipped, error }.
 * Vaulted credential holds a JSON blob { accessKeyId, secretAccessKey, region }
 * or a bare access key; inline config keys take precedence over vault region
 * only when the user set config.region explicitly.
 */
export async function resolveCreds(config, context) {
  let region = config.region || "us-east-1";
  let accessKey = config.accessKeyId;
  let secretKey = config.secretAccessKey;

  if (config.credentialId) {
    let raw;
    try {
      raw = await getOAuthToken(config.credentialId, context.workspaceId, "S3");
    } catch (e) {
      return { skipped: true, error: `S3: Could not resolve credential — ${e.message}` };
    }
    try {
      const j = JSON.parse(raw);
      accessKey = j.accessKeyId;
      secretKey = j.secretAccessKey;
      if (j.region && !config.region) region = j.region;
    } catch {
      accessKey = raw;
    }
  }

  if (!accessKey || !secretKey) {
    return { skipped: true, error: "S3: AWS credentials required (accessKeyId + secretAccessKey)." };
  }
  return { accessKey, secretKey, region };
}

/** Compute the request base URL for a bucket, honouring a custom endpoint. */
export function bucketBase(bucket, region, customEndpoint) {
  return customEndpoint ? `${customEndpoint}/${bucket}` : `https://${bucket}.s3.${region}.amazonaws.com`;
}

export function handleError(err) {
  if (err.message?.startsWith("S3")) throw err;
  const status = err.response?.status;
  const xmlBody = typeof err.response?.data === "string" ? err.response.data : "";
  const awsCode = xmlValues(xmlBody, "Code")[0] || "";
  const awsMsg = xmlValues(xmlBody, "Message")[0] || err.message;

  if (status === 403 || awsCode === "AccessDenied" || awsCode === "InvalidAccessKeyId" || awsCode === "SignatureDoesNotMatch") {
    throw new Error(`S3: Access denied (${awsCode || 403}) — ${awsMsg}. Check your AWS credentials.`);
  }
  if (status === 404 || awsCode === "NoSuchKey" || awsCode === "NoSuchBucket") {
    throw new Error(`S3: Not found (${awsCode || 404}) — ${awsMsg}.`);
  }
  if (status === 400 || awsCode === "MalformedXML" || awsCode === "InvalidArgument") {
    throw new Error(`S3: Bad request (${awsCode || 400}) — ${awsMsg}.`);
  }
  if (status === 409 || awsCode === "BucketAlreadyExists") {
    throw new Error(`S3: Conflict — ${awsMsg}.`);
  }
  if (status === 422) throw new Error(`S3: Unprocessable request (422) — ${awsMsg}.`);
  if (status === 429) throw new Error("S3: Too many requests — slow down or increase retry delay.");
  if (status >= 500) throw new Error(`S3: Server error (${status}) — ${awsMsg}. Retry later.`);
  throw new Error(`S3: ${awsCode || status || "Error"} — ${awsMsg}`);
}
