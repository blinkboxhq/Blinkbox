import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import crypto from "crypto";

// AWS Signature V4 signing for S3 requests
function sign(method, url, headers, body, accessKey, secretKey, region, service) {
  const u = new URL(url);
  const now = new Date();
  const date = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 8);
  const datetime = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";

  headers["x-amz-date"] = datetime;
  headers["host"] = u.host;

  const canonicalHeaders = Object.entries(headers).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k.toLowerCase()}:${v.trim()}\n`).join("");
  const signedHeaders = Object.keys(headers).sort().map(k => k.toLowerCase()).join(";");

  const bodyHash = crypto.createHash("sha256").update(body || "").digest("hex");
  headers["x-amz-content-sha256"] = bodyHash;

  const canonicalRequest = [method, u.pathname, u.search.slice(1), canonicalHeaders, signedHeaders, bodyHash].join("\n");
  const credScope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${datetime}\n${credScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;

  const getKey = (k, d) => crypto.createHmac("sha256", k).update(d).digest();
  const sigKey = getKey(getKey(getKey(getKey(`AWS4${secretKey}`, date), region), service), "aws4_request");
  const sig = crypto.createHmac("sha256", sigKey).update(stringToSign).digest("hex");

  headers["authorization"] = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credScope},SignedHeaders=${signedHeaders},Signature=${sig}`;
  return headers;
}

export default {
  async run(config, input, context = {}) {
    const OP_ALIAS = { upload: "putObject", download: "getObject", delete: "deleteObject", list: "listObjects", presign: "generatePresignedUrl" };
    const operation = OP_ALIAS[config.operation] || config.operation || "listObjects";
    const bucket = config.bucket || input.bucket || "";
    const region = config.region || "us-east-1";

    let accessKey = config.accessKeyId;
    let secretKey = config.secretAccessKey;
    if (config.credentialId) {
      const raw = await getOAuthToken(config.credentialId, context.workspaceId, "S3");
      try { const j = JSON.parse(raw); accessKey = j.accessKeyId; secretKey = j.secretAccessKey; } catch { accessKey = raw; }
    }
    if (!accessKey || !secretKey) return { success: false, error: "S3: AWS credentials required (accessKeyId + secretAccessKey).", skipped: true };
    if (!bucket) return { success: false, error: "S3: 'bucket' is required.", skipped: true };

    const customEndpoint = config.endpoint ? config.endpoint.replace(/\/$/, "") : null;
    const base = customEndpoint ? `${customEndpoint}/${bucket}` : `https://${bucket}.s3.${region}.amazonaws.com`;

    switch (operation) {
      case "listObjects": {
        const prefix = config.prefix || "";
        const url = `${base}/?list-type=2&prefix=${encodeURIComponent(prefix)}&max-keys=${config.limit || 100}`;
        const headers = sign("GET", url, {}, "", accessKey, secretKey, region, "s3");
        const { data } = await axios.get(url, { headers, timeout: 15000 });
        const items = [...(data.match(/<Key>([\s\S]*?)<\/Key>/g) || [])].map(m => m.replace(/<\/?Key>/g, ""));
        return { objects: items, count: items.length, bucket, prefix };
      }
      case "getObject": {
        const key = config.key || input.key || "";
        if (!key) return { success: false, error: "S3 getObject: 'key' is required.", skipped: true };
        const url = `${base}/${encodeURIComponent(key)}`;
        const headers = sign("GET", url, {}, "", accessKey, secretKey, region, "s3");
        const { data } = await axios.get(url, { headers, timeout: 30000, responseType: "text" });
        return { content: data, key, bucket };
      }
      case "putObject": {
        const key = config.key || input.key || "";
        const content = config.content || input.content || "";
        if (!key) return { success: false, error: "S3 putObject: 'key' is required.", skipped: true };
        const url = `${base}/${encodeURIComponent(key)}`;
        const headers = { "content-type": config.contentType || "text/plain" };
        sign("PUT", url, headers, content, accessKey, secretKey, region, "s3");
        await axios.put(url, content, { headers, timeout: 30000 });
        return { success: true, key, bucket, url: `https://${bucket}.s3.${region}.amazonaws.com/${key}` };
      }
      case "deleteObject": {
        const key = config.key || input.key || "";
        if (!key) return { success: false, error: "S3 deleteObject: 'key' is required.", skipped: true };
        const url = `${base}/${encodeURIComponent(key)}`;
        const headers = sign("DELETE", url, {}, "", accessKey, secretKey, region, "s3");
        await axios.delete(url, { headers, timeout: 15000 });
        return { success: true, key, bucket, deleted: true };
      }
      case "generatePresignedUrl": {
        const key = config.key || input.key || "";
        const expires = config.presignExpiry || config.expiresIn || 3600;
        if (!key) return { success: false, error: "S3 generatePresignedUrl: 'key' is required.", skipped: true };
        const presignBase = customEndpoint ? `${customEndpoint}/${bucket}` : `https://${bucket}.s3.${region}.amazonaws.com`;
        const url = `${presignBase}/${encodeURIComponent(key)}?X-Amz-Expires=${expires}`;
        return { url, key, bucket, expiresIn: expires };
      }
      case "exists": {
        const key = config.key || input.key || "";
        if (!key) return { success: false, error: "S3 exists: 'key' is required.", skipped: true };
        const url = `${base}/${encodeURIComponent(key)}`;
        const headers = sign("HEAD", url, {}, "", accessKey, secretKey, region, "s3");
        try {
          await axios.head(url, { headers, timeout: 10000 });
          return { exists: true, key, bucket };
        } catch (e) {
          if (e.response?.status === 404) return { exists: false, key, bucket };
          throw e;
        }
      }
      default:
        return { success: false, error: `S3: Unknown operation "${operation}".`, skipped: true };
    }
  },
};
