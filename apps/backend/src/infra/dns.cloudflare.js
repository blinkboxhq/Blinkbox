import { CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID } from "../config/env.js";

const API = "https://api.cloudflare.com/client/v4";

export const dnsEnabled = () => !!(CLOUDFLARE_API_TOKEN && CLOUDFLARE_ZONE_ID);

async function cf(path, options = {}) {
  const res = await fetch(`${API}/zones/${CLOUDFLARE_ZONE_ID}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    const detail = body?.errors?.[0]?.message || res.statusText;
    throw new Error(`Cloudflare ${res.status}: ${detail}`);
  }
  return body.result;
}

// Self-hosted boxes are proxy: false — Cloudflare's proxy would break the
// customer's own Let's Encrypt challenge and hide their origin's real IP.
export async function upsertARecord(hostname, ip, existingId = null) {
  const payload = { type: "A", name: hostname, content: ip, ttl: 120, proxied: false };
  if (existingId) {
    try {
      const r = await cf(`/dns_records/${existingId}`, { method: "PUT", body: JSON.stringify(payload) });
      return r.id;
    } catch {
      // Record was deleted out from under us — fall through and create a fresh one.
    }
  }
  const found = await cf(`/dns_records?type=A&name=${encodeURIComponent(hostname)}`);
  if (found?.length) {
    const r = await cf(`/dns_records/${found[0].id}`, { method: "PUT", body: JSON.stringify(payload) });
    return r.id;
  }
  const created = await cf("/dns_records", { method: "POST", body: JSON.stringify(payload) });
  return created.id;
}

export async function deleteRecord(recordId) {
  if (!recordId) return;
  await cf(`/dns_records/${recordId}`, { method: "DELETE" });
}
