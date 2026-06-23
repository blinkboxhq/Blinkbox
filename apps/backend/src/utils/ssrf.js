const BLOCKED_HOSTNAME = [
  /^localhost$/,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^0:0:0:0:0:0:0:1$/,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^fc00:/i,
  /^fe80:/i,
  /^fd[0-9a-f]{2}:/i,
  // IPv6-mapped IPv4 private addresses (e.g. ::ffff:127.0.0.1 bypasses IPv4 checks above)
  /^::ffff:127\./i,
  /^::ffff:10\./i,
  /^::ffff:172\.(1[6-9]|2\d|3[01])\./i,
  /^::ffff:192\.168\./i,
  /^::ffff:169\.254\./i,
  /^::ffff:0\./i,
  /\.internal$/,
  /\.local$/,
];

export function assertSafeHost(host) {
  const h = host.toLowerCase().trim();
  if (BLOCKED_HOSTNAME.some((r) => r.test(h))) {
    throw new Error(`SSRF blocked: "${h}" is a private/internal address.`);
  }
}

export function assertSafeUrl(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { throw new Error(`Invalid URL: "${rawUrl}"`); }
  if (!["http:", "https:"].includes(u.protocol)) {
    throw new Error(`SSRF blocked: only http/https protocols are allowed.`);
  }
  assertSafeHost(u.hostname);
}

// Block raw private/link-local IPs that the hostname regexes don't catch when a
// host *resolves* to them. Covers IPv4 + IPv6 private/loopback/link-local ranges.
function isPrivateIp(ip) {
  const a = ip.toLowerCase().trim();
  if (a === "::1" || a === "0:0:0:0:0:0:0:1") return true;
  if (/^f[cd][0-9a-f]{2}:/i.test(a)) return true;            // fc00::/7 unique-local
  if (/^fe80:/i.test(a)) return true;                         // link-local
  const m = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);        // IPv6-mapped IPv4
  const v4 = m ? m[1] : a;
  const parts = v4.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const [o1, o2] = parts.map(Number);
    if (o1 === 127 || o1 === 0 || o1 === 10) return true;
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
    if (o1 === 192 && o2 === 168) return true;
    if (o1 === 169 && o2 === 254) return true;
    if (o1 === 100 && o2 >= 64 && o2 <= 127) return true;     // CGNAT 100.64.0.0/10
  }
  return false;
}

// Full guard: protocol + hostname blocklist + DNS resolution check. Use this
// for every outbound request the agent makes — a public hostname (e.g. an
// attacker-controlled domain) that resolves to 169.254.169.254 or 127.0.0.1
// would pass the sync regex check but is caught here after resolution.
export async function assertSafeUrlResolved(rawUrl) {
  assertSafeUrl(rawUrl);
  const { hostname } = new URL(rawUrl);
  // If the host is already a literal IP, the sync check + isPrivateIp cover it.
  if (isPrivateIp(hostname)) {
    throw new Error(`SSRF blocked: "${hostname}" is a private/internal address.`);
  }
  const dns = await import("node:dns/promises");
  let records;
  try { records = await dns.lookup(hostname, { all: true }); }
  catch { return; } // DNS failure: let the request itself surface the network error
  for (const { address } of records) {
    if (isPrivateIp(address)) {
      throw new Error(`SSRF blocked: "${hostname}" resolves to private address ${address}.`);
    }
  }
}
