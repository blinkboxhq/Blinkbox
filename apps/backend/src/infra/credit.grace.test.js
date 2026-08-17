import { test } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "test-jwt-secret";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
process.env.GRACE_HOURS = "72";

const { graceVerdict } = await import("./credit.remote.js");

const HOUR = 3600_000;
const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);
const outage = new Error("ECONNREFUSED");
const answered = (status) => Object.assign(new Error("nope"), { response: { status } });

const verdict = (over) => graceVerdict({ err: outage, now: NOW, ...over });

test("a fresh stamp keeps the customer running through an outage", () => {
  const res = verdict({ lastGoodCheckAt: new Date(NOW - HOUR), graceHours: 72 });

  assert.equal(res.allowed, true, "a blinkbox.net outage must not stop paid workflows");
  assert.equal(res.reason, "grace");
  assert.equal(res.expiresAt, NOW - HOUR + 72 * HOUR);
});

test("past the window it fails closed", () => {
  const res = verdict({ lastGoodCheckAt: new Date(NOW - 73 * HOUR), graceHours: 72 });

  assert.equal(res.allowed, false);
  assert.equal(res.reason, "expired");
});

test("the last second inside the window still counts", () => {
  const res = verdict({ lastGoodCheckAt: new Date(NOW - 72 * HOUR + 1), graceHours: 72 });
  assert.equal(res.allowed, true);
});

test("an instance that never reached the cloud gets no grace at all", () => {
  for (const stamp of [null, undefined, ""]) {
    const res = verdict({ lastGoodCheckAt: stamp, graceHours: 72 });
    assert.equal(res.allowed, false, `no stamp (${JSON.stringify(stamp)}) means no grace`);
    assert.equal(res.reason, "never_reached");
  }
});

test("a 4xx is the cloud answering, not an outage — never run through", () => {
  for (const status of [400, 402, 403, 404, 429]) {
    const res = graceVerdict({ lastGoodCheckAt: new Date(NOW), graceHours: 72, err: answered(status), now: NOW });
    assert.equal(res.allowed, false, `${status} is a definite answer`);
    assert.equal(res.reason, "refused");
  }
});

test("a 5xx or a dead socket is an outage and does earn grace", () => {
  const fresh = { lastGoodCheckAt: new Date(NOW - HOUR), graceHours: 72, now: NOW };
  for (const err of [answered(500), answered(502), answered(503), outage]) {
    assert.equal(graceVerdict({ ...fresh, err }).allowed, true);
  }
});

test("the cloud's window wins over the instance's own env", () => {
  const stamp = new Date(NOW - 5 * HOUR);

  assert.equal(verdict({ lastGoodCheckAt: stamp, graceHours: 1 }).allowed, false, "a 1h window from the cloud closes early");
  assert.equal(verdict({ lastGoodCheckAt: stamp, graceHours: 720 }).allowed, true);
});

test("with no window from the cloud yet, the local default applies", () => {
  const res = verdict({ lastGoodCheckAt: new Date(NOW - HOUR), graceHours: null });

  assert.equal(res.allowed, true);
  assert.equal(res.expiresAt, NOW - HOUR + 72 * HOUR, "falls back to GRACE_HOURS");
});

test("graceHours 0 means no coasting, not 'unset'", () => {
  const res = verdict({ lastGoodCheckAt: new Date(NOW - 1000), graceHours: 0 });

  assert.equal(res.allowed, false, "a zero window must not silently become the 72h default");
  assert.equal(res.reason, "expired");
});
