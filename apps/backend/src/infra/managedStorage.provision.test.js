import { test } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "test-jwt-secret";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
process.env.MANAGED_STORAGE_SECRET = "test-managed-secret";

const { digestHeader, derivePassword, tenant, provisioningReady } = await import(
  "./managedStorage.provision.js"
);

// RFC 2617 §3.5 — the published worked example. If this drifts, every Atlas call
// this module makes is unauthenticated and we would only find out in production.
test("digest response matches the RFC 2617 vector", () => {
  const header = digestHeader(
    'Digest realm="testrealm@host.com", qop="auth,auth-int", ' +
      'nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", opaque="5ccc069c403ebaf9f0171e9517f40e41"',
    "GET",
    "/dir/index.html",
    { user: "Mufasa", pass: "Circle Of Life", cnonce: "0a4f113b", nc: "00000001" },
  );

  assert.match(header, /^Digest /);
  assert.match(header, /response="6629fae49393a05397450978507c4ef1"/);
  assert.match(header, /opaque="5ccc069c403ebaf9f0171e9517f40e41"/);
  assert.match(header, /qop=auth/);
  assert.match(header, /nc=00000001/);
  assert.match(header, /username="Mufasa"/);
});

test("a challenge without qop falls back to the RFC 2069 form", () => {
  const header = digestHeader('Digest realm="r", nonce="n"', "GET", "/x", {
    user: "u",
    pass: "p",
  });
  assert.doesNotMatch(header, /qop=/);
  assert.doesNotMatch(header, /cnonce=/);
});

test("tenant names are derived from the id and never collide across ids", () => {
  const a = tenant("aaaaaaaaaaaaaaaaaaaaaaaa");
  const b = tenant("bbbbbbbbbbbbbbbbbbbbbbbb");
  assert.equal(a.db, "bb_aaaaaaaaaaaaaaaaaaaaaaaa");
  assert.equal(a.prefix, "bb:aaaaaaaaaaaaaaaaaaaaaaaa:");
  assert.notEqual(a.db, b.db);
  assert.notEqual(a.prefix, b.prefix);
  // The prefix must end in a separator or bb:a: would also match bb:ab:.
  assert.ok(a.prefix.endsWith(":"));
});

test("the same tenant gets the same password every time — a renewal must not rotate it", () => {
  assert.equal(derivePassword("abc"), derivePassword("abc"));
  assert.equal(derivePassword("abc", 1), derivePassword("abc"));
});

test("bumping the version rotates, and two tenants never share a password", () => {
  assert.notEqual(derivePassword("abc", 1), derivePassword("abc", 2));
  assert.notEqual(derivePassword("abc"), derivePassword("abd"));
});

test("derived passwords are URI-safe, so they survive being embedded in a connection string", () => {
  const pass = derivePassword("507f1f77bcf86cd799439011");
  assert.equal(pass.length, 32);
  assert.match(pass, /^[A-Za-z0-9_-]+$/);
  assert.equal(encodeURIComponent(pass), pass);
});

test("provisioning reports itself unavailable when the operator has configured nothing", () => {
  assert.equal(provisioningReady(), false);
});
