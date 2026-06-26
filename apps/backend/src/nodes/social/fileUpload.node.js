import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";
import { assertSafeUrlResolved } from "../../utils/ssrf.js";

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
  async run(config, input, context) {
    const destination = config.destination || "s3";
    const base64 = config.base64 || input?.base64;
    const url = config.url || input?.url;
    const filename = config.filename || input?.filename || "upload";
    const contentType = config.contentType || input?.contentType || "application/octet-stream";

    if (destination === "http") {
      const uploadUrl = config.uploadUrl || input?.uploadUrl;
      if (!uploadUrl) throw new Error("file_upload: 'uploadUrl' required for HTTP destination.");
      await assertSafeUrlResolved(uploadUrl);
      const buffer = base64 ? Buffer.from(base64, "base64") : null;
      if (!buffer) throw new Error("file_upload: 'base64' required.");
      const res = await axios.put(uploadUrl, buffer, {
        headers: { "Content-Type": contentType, "Content-Length": buffer.length },
        timeout: 120000,
      });
      return { success: true, destination: "http", url: uploadUrl, status: res.status, filename };
    }

    if (destination === "s3") {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
      const bucket = config.bucket || input?.bucket;
      const key = config.key || filename;
      if (!bucket) throw new Error("file_upload: 'bucket' required for S3.");
      const apiKey = config.credentialId && await getKey(config.credentialId, context?.workspaceId, "AWS");
      const [accessKeyId, secretAccessKey] = apiKey ? apiKey.split(":") : [config.accessKeyId, config.secretAccessKey];
      const client = new S3Client({ region: config.region || "us-east-1", credentials: { accessKeyId, secretAccessKey } });
      const buffer = Buffer.from(base64, "base64");
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }));
      return { success: true, destination: "s3", bucket, key, url: `https://${bucket}.s3.amazonaws.com/${key}`, filename };
    }

    throw new Error(`file_upload: unsupported destination "${destination}". Use "s3" or "http".`);
  },
};
