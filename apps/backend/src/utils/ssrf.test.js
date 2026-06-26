import test from "node:test";
import assert from "node:assert/strict";
import { assertSafeHost, assertSafeUrl, assertSafeUrlResolved } from "./ssrf.js";

// Every literal host class that must be refused outright by the sync blocklist.
const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "127.255.255.255",
  "0.0.0.0",
  "10.0.0.1",
  "10.255.255.255",
  "172.16.0.1",
  "172.20.5.5",
  "172.31.255.255",
  "192.168.1.1",
  "169.254.169.254", // cloud metadata endpoint (AWS/GCP/Azure)
  "::1",
  "0:0:0:0:0:0:0:1",
  "fc00::1",
  "fd12:3456::1",
  "fe80::1",
  "::ffff:127.0.0.1", // IPv6-mapped IPv4 loopback
  "::ffff:10.0.0.1",
  "::ffff:192.168.0.1",
  "::ffff:169.254.169.254",
  "metadata.internal",
  "printer.local",
];

// Public hosts and the exact edges just outside each private range — must pass.
const ALLOWED_HOSTS = [
  "example.com",
  "api.github.com",
  "8.8.8.8",
  "1.1.1.1",
  "11.0.0.1", // not 10/8
  "172.15.0.1", // one below the 172.16–31 private block
  "172.32.0.1", // one above
  "192.169.0.1", // not 192.168/16
  "169.253.0.1", // not 169.254/16
];

test("assertSafeHost blocks every private / link-local / mapped / internal class", () => {
  for (const host of BLOCKED_HOSTS) {
    assert.throws(() => assertSafeHost(host), /SSRF blocked/, `expected ${host} to be blocked`);
  }
});

test("assertSafeHost allows public hosts and the boundaries just outside private ranges", () => {
  for (const host of ALLOWED_HOSTS) {
    assert.doesNotThrow(() => assertSafeHost(host), `expected ${host} to be allowed`);
  }
});

test("assertSafeUrl permits only http/https", () => {
  for (const url of ["file:///etc/passwd", "gopher://127.0.0.1:6379/_INFO", "ftp://example.com/x", "data:text/plain,hi"]) {
    assert.throws(() => assertSafeUrl(url), /SSRF blocked|Invalid URL/, `expected ${url} to be rejected`);
  }
  assert.doesNotThrow(() => assertSafeUrl("https://example.com/path?q=1"));
  assert.doesNotThrow(() => assertSafeUrl("http://8.8.8.8/health"));
});

test("assertSafeUrl blocks the cloud metadata endpoint", () => {
  assert.throws(
    () => assertSafeUrl("http://169.254.169.254/latest/meta-data/iam/security-credentials/"),
    /SSRF blocked/,
  );
});

test("assertSafeUrlResolved blocks literal private IPs — including CGNAT 100.64/10 that a plain string blocklist misses", async () => {
  // CGNAT is the class the old per-node copies did NOT cover: the sync blocklist
  // lets it through, the resolution guard catches it via isPrivateIp.
  assert.doesNotThrow(() => assertSafeHost("100.64.0.1"), "sanity: sync blocklist alone misses CGNAT");

  for (const url of [
    "http://127.0.0.1/",
    "http://10.0.0.5/admin",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://100.64.0.1/", // CGNAT lower bound
    "http://100.127.255.255/", // CGNAT upper bound
  ]) {
    await assert.rejects(() => assertSafeUrlResolved(url), /SSRF blocked/, `expected ${url} to be blocked`);
  }
});

test("assertSafeUrlResolved blocks numeric-encoded loopback after DNS normalization (rebinding mechanism)", async () => {
  // http://2130706433/ — decimal form of 127.0.0.1. It survives the string
  // blocklist, then getaddrinfo normalizes it to 127.0.0.1 and the resolved
  // guard rejects it. This exercises the same resolve→inspect path that defeats
  // DNS rebinding (a public A record pointing at a private address).
  assert.doesNotThrow(() => assertSafeHost("2130706433"), "sanity: string blocklist alone misses numeric encoding");
  await assert.rejects(() => assertSafeUrlResolved("http://2130706433/"), /SSRF blocked/);
});

test("assertSafeUrlResolved allows a normal public host", async () => {
  // Literal public IPs resolve to themselves with no network round-trip.
  await assert.doesNotReject(() => assertSafeUrlResolved("http://8.8.8.8/"));
  await assert.doesNotReject(() => assertSafeUrlResolved("https://1.1.1.1/"));
});
