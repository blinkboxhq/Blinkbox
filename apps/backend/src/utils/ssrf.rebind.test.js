import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { assertSafeUrlResolved } from "./ssrf.js";

// DNS-rebinding: a public-looking hostname whose A record points at a private
// address. The sync blocklist passes it; the resolution guard must catch it.
const REBIND_TABLE = {
  "attacker.example.com": [{ address: "127.0.0.1", family: 4 }],
  "cdn.legit.io": [{ address: "169.254.169.254", family: 4 }],
  "intranet.saas.dev": [{ address: "10.0.0.8", family: 4 }],
  "v6.attacker.net": [{ address: "::1", family: 6 }],
  "mixed.attacker.net": [
    { address: "93.184.216.34", family: 4 },
    { address: "192.168.1.50", family: 4 },
  ],
  "good.example.com": [{ address: "93.184.216.34", family: 4 }],
};

test("DNS rebinding: public hostname resolving to a private IP is rejected", async (t) => {
  t.mock.module("node:dns/promises", {
    namedExports: {
      lookup: async (hostname) => {
        const records = REBIND_TABLE[hostname];
        if (!records) throw Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" });
        return records;
      },
    },
  });

  for (const host of [
    "attacker.example.com",
    "cdn.legit.io",
    "intranet.saas.dev",
    "v6.attacker.net",
  ]) {
    await assert.rejects(
      () => assertSafeUrlResolved(`https://${host}/payload`),
      /SSRF blocked.*resolves to private address/,
      `expected rebound ${host} to be blocked`,
    );
  }
});

test("DNS rebinding: one private record among public ones still rejects", async (t) => {
  t.mock.module("node:dns/promises", {
    namedExports: {
      lookup: async (hostname) => REBIND_TABLE[hostname] ?? [],
    },
  });
  await assert.rejects(
    () => assertSafeUrlResolved("https://mixed.attacker.net/"),
    /SSRF blocked.*192\.168\.1\.50/,
  );
});

test("hostname resolving to a public IP passes the resolution guard", async (t) => {
  t.mock.module("node:dns/promises", {
    namedExports: {
      lookup: async (hostname) => REBIND_TABLE[hostname] ?? [],
    },
  });
  await assert.doesNotReject(() => assertSafeUrlResolved("https://good.example.com/ok"));
});

test("sanity: mock is restored — literal private IP still blocked without DNS", async () => {
  mock.restoreAll();
  await assert.rejects(() => assertSafeUrlResolved("http://127.0.0.1/"), /SSRF blocked/);
});
