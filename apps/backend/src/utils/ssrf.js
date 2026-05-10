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
