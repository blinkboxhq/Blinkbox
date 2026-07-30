import { test, mock } from "node:test";
import assert from "node:assert/strict";

const MX_TABLE = {
  "good.com": [{ exchange: "mx.good.com", priority: 10 }],
  "no-mx.com": [],
};

mock.module("node:dns/promises", {
  namedExports: {
    resolveMx: async (domain) => {
      const records = MX_TABLE[domain];
      if (!records || records.length === 0) {
        throw Object.assign(new Error("ENODATA"), { code: "ENODATA" });
      }
      return records;
    },
  },
});

const load = async () => (await import("./emailVerifier.node.js")).default;

test("rejects invalid email syntax", async () => {
  const verifier = await load();
  const out = await verifier.run({ requireMx: false }, { leads: [{ email: "not-an-email" }] });
  assert.equal(out.rejected.length, 1);
  assert.equal(out.rejected[0].__rejectReason, "invalid_syntax");
  assert.equal(out.verified.length, 0);
});

test("rejects role addresses", async () => {
  const verifier = await load();
  const out = await verifier.run({ requireMx: false }, { leads: [{ email: "info@good.com" }] });
  assert.equal(out.rejected[0].__rejectReason, "role_address");
});

test("rejects disposable domains", async () => {
  const verifier = await load();
  const out = await verifier.run({ requireMx: false }, { leads: [{ email: "a@mailinator.com" }] });
  assert.equal(out.rejected[0].__rejectReason, "disposable_domain");
});

test("verifies via MX and rejects domains with no MX records", async () => {
  const verifier = await load();
  const out = await verifier.run(
    {},
    { leads: [{ email: "a@good.com" }, { email: "b@no-mx.com" }] },
  );
  assert.equal(out.verified.length, 1);
  assert.equal(out.verified[0].email, "a@good.com");
  assert.equal(out.rejected.length, 1);
  assert.equal(out.rejected[0].__rejectReason, "no_mx");
  assert.equal(out.domainsChecked, 2);
});

test("accepts an inline array via arrayPath and skips MX for role-filtered domains", async () => {
  const verifier = await load();
  const rows = [{ email: "a@good.com" }, { email: "info@good.com" }];
  const out = await verifier.run({ arrayPath: rows }, {});
  assert.equal(out.verifiedCount, 1);
  assert.equal(out.rejectedCount, 1);
  assert.equal(out.domainsChecked, 1, "role-address hit shouldn't trigger a redundant MX lookup");
});

test("requireMx: false skips DNS entirely and trusts syntax+gates", async () => {
  const verifier = await load();
  const out = await verifier.run(
    { requireMx: false },
    { leads: [{ email: "person@anydomain.example" }] },
  );
  assert.equal(out.verified.length, 1);
  assert.equal(out.domainsChecked, 0);
});
