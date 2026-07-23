/**
 * Mailchimp — shared primitives. Credential resolution, error mapping, the
 * data-center-aware client builder (Basic auth, NOT Bearer), the email→MD5 hash
 * helper, and a thin request wrapper. Mailchimp API v3.
 *
 * Auth: Mailchimp API key in vault (format: key-dcXX). Basic Auth is
 * `anystring:apikey` — the data-center suffix (e.g. "us6") is parsed from the
 * key and used to build the regional base URL.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";
import { createHash } from "crypto";

export async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Mailchimp");
}

export function handleError(err) {
  if (err.message?.startsWith("Mailchimp")) throw err;
  const status = err.response?.status;
  const detail = err.response?.data?.detail || err.response?.data?.errors?.[0]?.message || err.message;
  const title = err.response?.data?.title || "";
  if (status === 401) throw new Error("Mailchimp: Invalid API key.");
  if (status === 403) throw new Error(`Mailchimp: Forbidden — ${detail}`);
  if (status === 404) throw new Error(`Mailchimp: Resource not found — ${detail}`);
  if (status === 400) throw new Error(`Mailchimp: Bad request — ${title}: ${detail}`);
  if (status === 422) throw new Error(`Mailchimp: Unprocessable — ${title}: ${detail}`);
  if (status === 429) throw new Error("Mailchimp: Rate limit exceeded. Retry later.");
  if (status >= 500) throw new Error(`Mailchimp: Server error (${status}) — try again later.`);
  throw new Error(`Mailchimp failed: ${status || err.code} — ${err.message}`);
}

export function buildClient(apiKey) {
  const dc = apiKey.split("-").pop();
  if (!dc || dc === apiKey) throw new Error("Mailchimp: API key format invalid — expected 'key-dcXX' (e.g. abc123-us6).");
  const base = `https://${dc}.api.mailchimp.com/3.0`;
  const auth = { username: "anystring", password: apiKey };
  const headers = { "Content-Type": "application/json" };
  return { base, auth, headers };
}

export function emailHash(email) {
  return createHash("md5").update(String(email).toLowerCase().trim()).digest("hex");
}

// Thin axios wrapper — all handlers go through this so timeout, auth, and
// content-type stay consistent. `path` is appended to the DC base URL.
export async function req(client, method, path, { params, body, timeout = 120000 } = {}) {
  const { data } = await axios({
    method,
    url: `${client.base}${path}`,
    auth: client.auth,
    headers: client.headers,
    ...(params ? { params } : {}),
    ...(body !== undefined ? { data: body } : {}),
    timeout,
  });
  return data;
}

// Members are addressed by the lowercased-email MD5 hash OR a raw subscriber
// hash. Accept either so callers can pass whichever they have.
export function memberId(idOrEmail) {
  const v = String(idOrEmail || "");
  return v.includes("@") ? emailHash(v) : v;
}
