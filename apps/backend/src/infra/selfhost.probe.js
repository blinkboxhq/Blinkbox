import crypto from "node:crypto";
import axios from "axios";

// Deciding where <name>.blinkbox.net should point is the whole ballgame. The
// installer cannot tell us: the address a box reaches the internet *from* is not
// always the address the internet reaches it *at* — behind a cloud NAT gateway,
// on a multi-homed VPS, or on a home connection they are routinely different.
// Trusting the claim is what put customers' subdomains on an address that was
// not theirs and left the site permanently unreachable.
//
// So the cloud checks instead: it asks each candidate address for /health with a
// one-time nonce, and only an install holding the same probe token can return
// the matching fingerprint. First address that answers correctly is the one the
// A record gets. Nothing else is ever pointed at.

const PROBE_TIMEOUT_MS = 5000;

export function probeFingerprint(token, nonce) {
  if (!token || !nonce) return null;
  return crypto.createHash("sha256").update(`${token}:${nonce}`).digest("hex").slice(0, 32);
}

export function probeNonce() {
  return crypto.randomBytes(12).toString("hex");
}

// Rejects anything that is not a public unicast IPv4: loopback, RFC1918,
// link-local, CGNAT and multicast. This doubles as the SSRF guard — the prober
// only ever dials an address that survives this, on port 80, without redirects.
export function publicIPv4(raw) {
  const ip = String(raw || "").trim().replace(/^::ffff:/, "");
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return null;
  const [a, b, c, d] = m.slice(1).map(Number);
  if ([a, b, c, d].some((n) => n > 255)) return null;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return null;
  if (a === 169 && b === 254) return null;
  if (a === 172 && b >= 16 && b <= 31) return null;
  if (a === 192 && b === 168) return null;
  if (a === 100 && b >= 64 && b <= 127) return null;
  return ip;
}

export function candidateIPs(...groups) {
  const out = [];
  for (const group of groups) {
    for (const raw of [].concat(group || [])) {
      const ip = publicIPv4(raw);
      if (ip && !out.includes(ip)) out.push(ip);
    }
  }
  return out.slice(0, 8);
}

// Resolves to { ok, reason, status } — never throws, never follows a redirect,
// and reads at most a few KB so a hostile listener cannot tie up the cloud.
export async function probeAddress(ip, token) {
  const safe = publicIPv4(ip);
  if (!safe) return { ok: false, reason: "not a public IPv4" };
  if (!token) return { ok: false, reason: "no probe token on file" };

  const nonce = probeNonce();
  try {
    const res = await axios.get(`http://${safe}/health`, {
      params: { probe: nonce },
      timeout: PROBE_TIMEOUT_MS,
      maxRedirects: 0,
      maxContentLength: 64 * 1024,
      responseType: "json",
      validateStatus: () => true,
      headers: { "User-Agent": "blinkbox-selfhost-probe/1" },
    });
    // /health answers 503 while Mongo or Redis are still warming up, and the
    // fingerprint is present either way — reachability is the question here.
    const got = res.data && typeof res.data === "object" ? res.data.probe : null;
    if (!got) {
      // The overwhelmingly common case on a home connection: port 80 reaches the
      // router's own admin page, not the box behind it. Saying "unreachable"
      // sends people hunting a firewall; naming the squatter sends them to the
      // one setting that actually fixes it.
      const squatter = typeof res.data === "string" || String(res.headers?.["content-type"] || "").includes("html");
      return {
        ok: false,
        status: res.status,
        reason: squatter
          ? "port 80 is answering, but with a web page that is not Blinkbox — most likely your router's own admin panel. Forward external port 80 and 443 to this machine, and move the router's admin page off port 80."
          : `no probe answer (HTTP ${res.status})`,
      };
    }
    if (got !== probeFingerprint(token, nonce)) {
      return { ok: false, reason: "answered, but not this install", status: res.status };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    return { ok: false, reason: err.code === "ECONNABORTED" ? "no answer on port 80 (timed out)" : err.code || err.message };
  }
}

// Tries each candidate in order and returns the first that proves itself.
export async function findReachableIP(candidates, token) {
  const tried = [];
  for (const ip of candidateIPs(candidates)) {
    const result = await probeAddress(ip, token);
    if (result.ok) return { ip, tried };
    tried.push({ ip, reason: result.reason });
  }
  return { ip: null, tried };
}
