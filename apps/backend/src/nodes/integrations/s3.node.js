import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import crypto from "crypto";

function hmac(key, data, encoding) {
  return crypto.createHmac("sha256", key).update(data).digest(encoding);
}

function sha256hex(data) {
  return crypto.createHash("sha256").update(data || "").digest("hex");
}

function getSigningKey(secretKey, date, region, service) {
  const kDate    = hmac(`AWS4${secretKey}`, date);
  const kRegion  = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function isoDate(d) { return d.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 8); }
function isoDateTime(d) { return d.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z"; }

function signRequest(method, url, extraHeaders, body, accessKey, secretKey, region) {
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

  const canonicalHeaderKeys = Object.keys(headers).map(k => k.toLowerCase()).sort();
  const canonicalHeaders = canonicalHeaderKeys.map(k => `${k}:${headers[k]}\n`).join("");
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

function buildPresignedUrl(method, url, accessKey, secretKey, region, expiresIn) {
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

function xmlValues(xml, tag) {
  const re = new RegExp(`<${tag}>([\s\S]*?)<\/${tag}>`, "g");
  const out = [];
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

function handleError(err) {
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

export default {
  async run(config, input, context = {}) {
    const OP_ALIAS = { upload: "putObject", download: "getObject", delete: "deleteObject", list: "listObjects", presign: "generatePresignedUrl" };
    const operation = OP_ALIAS[config.operation] || config.operation || "listObjects";
    const bucket = config.bucket || input?.bucket || "";
    let region = config.region || "us-east-1";

    let accessKey = config.accessKeyId;
    let secretKey = config.secretAccessKey;

    if (!config.credentialId && !accessKey) {
      return { success: false, error: "S3: No credential selected.", skipped: true };
    }

    if (config.credentialId) {
      let raw;
      try {
        raw = await getOAuthToken(config.credentialId, context.workspaceId, "S3");
      } catch (e) {
        return { success: false, error: `S3: Could not resolve credential — ${e.message}`, skipped: true };
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
      return { success: false, error: "S3: AWS credentials required (accessKeyId + secretAccessKey).", skipped: true };
    }
    if (!bucket) {
      return { success: false, error: "S3: 'bucket' is required.", skipped: true };
    }

    const customEndpoint = config.endpoint ? config.endpoint.replace(/\/$/, "") : null;
    const base = customEndpoint ? `${customEndpoint}/${bucket}` : `https://${bucket}.s3.${region}.amazonaws.com`;

    try {
      switch (operation) {
        case "listObjects": {
          const prefix = config.prefix || "";
          const maxKeys = Number(config.limit || 100);
          const url = `${base}/?list-type=2&prefix=${encodeURIComponent(prefix)}&max-keys=${maxKeys}`;
          const signed = signRequest("GET", url, {}, "", accessKey, secretKey, region);
          const { data } = await axios.get(url, { headers: signed, timeout: 15000 });
          const keys  = xmlValues(data, "Key");
          const sizes = xmlValues(data, "Size");
          const dates = xmlValues(data, "LastModified");
          const objects = keys.map((k, i) => ({ key: k, size: sizes[i] ? Number(sizes[i]) : undefined, lastModified: dates[i] }));
          return { objects, count: objects.length, bucket, prefix };
        }

        case "getObject": {
          const key = config.key || input?.key || "";
          if (!key) return { success: false, error: "S3 getObject: 'key' is required.", skipped: true };
          const url = `${base}/${encodeURIComponent(key)}`;
          const signed = signRequest("GET", url, {}, "", accessKey, secretKey, region);
          const { data, headers: resHeaders } = await axios.get(url, { headers: signed, timeout: 30000, responseType: "text" });
          return { content: data, key, bucket, contentType: resHeaders["content-type"], contentLength: resHeaders["content-length"] };
        }

        case "putObject": {
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

        case "deleteObject": {
          const key = config.key || input?.key || "";
          if (!key) return { success: false, error: "S3 deleteObject: 'key' is required.", skipped: true };
          const url = `${base}/${encodeURIComponent(key)}`;
          const signed = signRequest("DELETE", url, {}, "", accessKey, secretKey, region);
          await axios.delete(url, { headers: signed, timeout: 15000 });
          return { success: true, deleted: true, key, bucket };
        }

        case "generatePresignedUrl": {
          const key = config.key || input?.key || "";
          const expiresIn = Number(config.presignExpiry || config.expiresIn || 3600);
          const method = (config.presignMethod || "GET").toUpperCase();
          if (!key) return { success: false, error: "S3 generatePresignedUrl: 'key' is required.", skipped: true };
          const rawUrl = `${base}/${encodeURIComponent(key)}`;
          const presignedUrl = buildPresignedUrl(method, rawUrl, accessKey, secretKey, region, expiresIn);
          return { url: presignedUrl, key, bucket, method, expiresIn };
        }

        case "exists": {
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

        default:
          return { success: false, error: `S3: Unknown operation "${operation}".`, skipped: true };
      }
    } catch (err) {
      handleError(err);
    }
  },
};
