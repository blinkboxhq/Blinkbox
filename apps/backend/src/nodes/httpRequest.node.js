/**
 * HTTP REQUEST NODE
 *
 * Talks to external APIs with RBI-level encrypted credential injection.
 * Securely decrypts keys from the Vault at runtime — never logged, never cached.
 *
 * Binary Detection:
 *   When a response carries binary content (image, PDF, archive, etc.),
 *   the raw buffer is streamed to the binary store (S3 or local disk)
 *   and a lightweight metadata pointer is returned instead.
 *   This prevents Temporal history bloat from Base64-encoded files.
 *
 * Config:
 *   url             — Target URL (required, already expression-resolved)
 *   method          — GET | POST | PUT | PATCH | DELETE (default: GET)
 *   headers         — Object of custom headers
 *   body            — Request body (for POST/PUT/PATCH)
 *   credentialId    — Reference to encrypted credential in Vault
 *   queryParams     — Object of URL query parameters
 *   timeout         — Request timeout in ms (default: 15000, max: 60000)
 *   followRedirects — Boolean (default: true)
 *   responseType    — "auto" (default) | "json" | "binary" — force binary handling
 */

import axios from "axios";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";
import { storeBinary, isBinaryContentType } from "../infra/binary.store.js";

const MAX_RESPONSE_BYTES = 25 * 1024 * 1024; // 25 MB for binary downloads
const MAX_TIMEOUT_MS = 60000;

export default {
  toolDefinition: {
    name: "http_request",
    description: "Make an HTTP request to an external API or URL. Supports GET, POST, PUT, PATCH, DELETE methods with custom headers and body. Automatically detects and stores binary responses (images, PDFs, etc.).",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to request" },
        method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"], description: "HTTP method (default: GET)" },
        body: { type: "object", description: "Request body for POST/PUT/PATCH" },
        headers: { type: "object", description: "Custom request headers as key-value pairs" },
        responseType: { type: "string", enum: ["auto", "json", "binary"], description: "Force response handling mode (default: auto-detect)" },
      },
      required: ["url"],
    },
  },

  async run(config, input, context = {}) {
    const {
      url,
      method = "GET",
      headers = {},
      body = null,
      credentialId,
      queryParams = {},
      timeout = 15000,
      followRedirects = true,
      responseType = "auto",
      workflowId,
      nodeId,
    } = config;

    if (!url) throw new Error("HTTP Request: 'url' is required.");

    // SSRF guard — block internal/cloud-metadata addresses
    function assertSafeUrl(rawUrl) {
      let parsed;
      try { parsed = new URL(rawUrl); } catch { throw new Error(`HTTP Request: invalid URL "${rawUrl}"`); }

      const hostname = parsed.hostname.toLowerCase();

      const blocked = [
        /^localhost$/,
        /^127\./,
        /^0\.0\.0\.0$/,
        /^::1$/,
        /^10\./,
        /^172\.(1[6-9]|2\d|3[01])\./,
        /^192\.168\./,
        /^169\.254\./,    // AWS/GCP/Azure metadata
        /^fc00:/i,        // IPv6 unique local
        /^fe80:/i,        // IPv6 link-local
        /^fd[0-9a-f]{2}:/i,
        /^0\b/,
      ];

      if (blocked.some((re) => re.test(hostname))) {
        throw new Error(`HTTP Request: requests to internal addresses are not allowed (${hostname})`);
      }

      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error(`HTTP Request: only http/https protocols are allowed`);
      }
    }

    assertSafeUrl(url);

    const finalHeaders = { "Content-Type": "application/json", ...headers };
    const clampedTimeout = Math.min(Math.max(timeout, 1000), MAX_TIMEOUT_MS);

    // Vault: resolve + decrypt credentials at runtime
    if (credentialId) {
      const cred = await resolveCredential(credentialId, context.workspaceId, "HTTP Request");
      const secretValue = decrypt(cred.encryptedData, cred.iv, cred.authTag);

      switch (cred.type) {
        case "bearer":
          finalHeaders["Authorization"] = `Bearer ${secretValue}`;
          break;
        case "api_key":
          finalHeaders["x-api-key"] = secretValue;
          break;
        case "basic": {
          const encoded = Buffer.from(secretValue, "utf-8").toString("base64");
          finalHeaders["Authorization"] = `Basic ${encoded}`;
          break;
        }
      }
    }

    // Determine if we should request binary data
    const forceBinary = responseType === "binary";
    const forceJson = responseType === "json";

    try {
      const response = await axios({
        url,
        method: method.toUpperCase(),
        headers: finalHeaders,
        data: ["POST", "PUT", "PATCH"].includes(method.toUpperCase()) ? body : undefined,
        params: queryParams,
        timeout: clampedTimeout,
        maxContentLength: MAX_RESPONSE_BYTES,
        maxRedirects: followRedirects ? 5 : 0,
        validateStatus: () => true,
        // Request as arraybuffer when binary is forced or auto-detected
        // In auto mode, we request arraybuffer and check Content-Type after
        responseType: forceJson ? "json" : "arraybuffer",
      });

      const contentType = response.headers["content-type"] || "";
      const shouldStoreBinary =
        forceBinary || (!forceJson && isBinaryContentType(contentType));

      if (shouldStoreBinary && Buffer.isBuffer(response.data)) {
        // Stream binary to object storage — return metadata pointer
        const wfId = workflowId || context.workflowId || "unknown";
        const nId = nodeId || "http_request";

        const binaryMeta = await storeBinary(
          wfId,
          nId,
          response.data,
          contentType.split(";")[0].trim(),
          response.headers,
        );

        return {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: binaryMeta,
          binary: true,
        };
      }

      // Non-binary: parse arraybuffer back to text/JSON
      let data = response.data;
      if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
        const text = Buffer.from(data).toString("utf-8");
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data,
      };
    } catch (err) {
      if (err.code === "ECONNABORTED") {
        throw new Error(`HTTP Request: Timeout after ${clampedTimeout}ms`);
      }
      throw new Error(
        `HTTP Request failed: ${err.response?.status || err.code} — ${err.message}`,
      );
    }
  },
};
