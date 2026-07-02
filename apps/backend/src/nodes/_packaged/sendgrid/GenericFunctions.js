/**
 * SendGrid — shared helpers for all v1 resource files.
 * Handlers receive `(config, token)` where token is the SendGrid API key;
 * makeReq(token) is the identity passthrough the slim entry uses to preserve
 * that calling convention.
 */
export const BASE = "https://api.sendgrid.com/v3";

export function handleError(err) {
  if (err.message.startsWith("SendGrid")) throw err;
  const status = err.response?.status;
  const errors = err.response?.data?.errors;
  const msg = errors?.[0]?.message || err.message;
  if (status === 401 || status === 403) throw new Error("SendGrid: Invalid API key or insufficient permissions.");
  if (status === 400) throw new Error(`SendGrid: ${msg}`);
  if (status === 429) throw new Error("SendGrid: Rate limit exceeded. Retry later.");
  throw new Error(`SendGrid failed: ${status || err.code} — ${err.message}`);
}

export function auth(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export function parseAddress(addr) {
  // Accept "Name <email>" or plain "email"
  const match = String(addr).match(/^(.*?)<(.+?)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { email: addr.trim() };
}

// SendGrid passes the resolved API key straight through to handlers.
export function makeReq(token) {
  return token;
}
