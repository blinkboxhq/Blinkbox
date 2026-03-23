/**
 * HTTP REQUEST NODE
 *
 * Talks to external APIs with RBI-level encrypted credential injection.
 * Securely decrypts keys from the Vault at runtime — never logged, never cached.
 *
 * Config:
 *   url          — Target URL (required, already expression-resolved)
 *   method       — GET | POST | PUT | PATCH | DELETE (default: GET)
 *   headers      — Object of custom headers
 *   body         — Request body (for POST/PUT/PATCH)
 *   credentialId — Reference to encrypted credential in Vault
 *   queryParams  — Object of URL query parameters
 *   timeout      — Request timeout in ms (default: 15000, max: 60000)
 *   followRedirects — Boolean (default: true)
 *
 * Credential Types (from Vault):
 *   bearer  → Authorization: Bearer <token>
 *   api_key → x-api-key: <key>
 *   basic   → Authorization: Basic <base64(user:pass)>
 */

import axios from "axios";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const MAX_TIMEOUT_MS = 60000;

export default {
  toolDefinition: {
    name: "http_request",
    description: "Make an HTTP request to an external API or URL. Supports GET, POST, PUT, PATCH, DELETE methods with custom headers and body.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to request" },
        method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"], description: "HTTP method (default: GET)" },
        body: { type: "object", description: "Request body for POST/PUT/PATCH" },
        headers: { type: "object", description: "Custom request headers as key-value pairs" },
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
    } = config;

    if (!url) throw new Error("HTTP Request: 'url' is required.");

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
        validateStatus: () => true, // Don't throw on 4xx/5xx — let the user decide
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
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
