import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import fs from "fs";

const github = (await import("./github.js")).default;
const stripe = (await import("./stripe.js")).default;
const webhook = (await import("./webhook.js")).default;
const form = (await import("./form.js")).default;
const manual = (await import("./manual.js")).default;

const sign = (body, secret, prefix = "sha256=") =>
  prefix + crypto.createHmac("sha256", secret).update(body).digest("hex");

// ── github ───────────────────────────────────────────────────────────────────

const SECRET = "s3cret";
const pushBody = {
  ref: "refs/heads/main",
  before: "aaa",
  after: "bbb",
  forced: true,
  repository: { full_name: "acme/app", html_url: "https://gh/acme/app", owner: { login: "acme" } },
  sender: { login: "ada", html_url: "https://gh/ada" },
  head_commit: { message: "ship it", author: { name: "Ada" }, url: "https://gh/c/1", timestamp: "2026-01-01T00:00:00Z" },
  commits: [{ id: "1", message: "ship it", author: { name: "Ada" }, url: "https://gh/c/1", added: ["a.js"], modified: [] }],
};

test("github rejects a payload whose signature does not match the body", async () => {
  const raw = JSON.stringify(pushBody);
  await assert.rejects(
    () => github.run(
      { secret: SECRET },
      { body: pushBody, rawBody: raw, signature: sign("tampered", SECRET), githubEvent: "push" },
    ),
    /Invalid webhook signature/,
  );
});

test("github accepts a correctly signed payload", async () => {
  const raw = JSON.stringify(pushBody);
  const out = await github.run(
    { secret: SECRET },
    { body: pushBody, rawBody: raw, signature: sign(raw, SECRET), githubEvent: "push" },
  );
  assert.equal(out.branch, "main");
});

test("github skips verification when no secret is configured", async () => {
  const out = await github.run({}, { body: pushBody, githubEvent: "push" });
  assert.equal(out.branch, "main");
});

test("github flattens a push into branch, commits and repo fields", async () => {
  const out = await github.run({}, { body: pushBody, githubEvent: "push" });
  assert.equal(out.event, "push");
  assert.equal(out.branch, "main");
  assert.equal(out.tag, null);
  assert.equal(out.repoName, "acme/app");
  assert.equal(out.repoOwner, "acme");
  assert.equal(out.sender, "ada");
  assert.equal(out.commitMessage, "ship it");
  assert.equal(out.forced, true);
  assert.deepEqual(out.commits[0].added, ["a.js"]);
});

test("github distinguishes a tag push from a branch push", async () => {
  const out = await github.run({}, { body: { ...pushBody, ref: "refs/tags/v1.2.0" }, githubEvent: "push" });
  assert.equal(out.tag, "v1.2.0");
});

test("github reads the event from the header when no explicit event is given", async () => {
  const out = await github.run({}, { body: pushBody, headers: { "x-github-event": "push" } });
  assert.equal(out.event, "push");
});

test("github shapes pull_request, issues and release events", async () => {
  const pr = await github.run({}, {
    githubEvent: "pull_request",
    body: { action: "opened", pull_request: { number: 7, title: "Fix", state: "open", user: { login: "ada" }, base: { ref: "main" }, head: { ref: "fix" }, merged: false, draft: true } },
  });
  assert.equal(pr.prNumber, 7);
  assert.equal(pr.baseBranch, "main");
  assert.equal(pr.headBranch, "fix");
  assert.equal(pr.draft, true);
  assert.equal(pr.action, "opened");

  const issue = await github.run({}, {
    githubEvent: "issues",
    body: { issue: { number: 3, title: "Bug", state: "open", user: { login: "ada" }, labels: [{ name: "p1" }, { name: "bug" }] } },
  });
  assert.deepEqual(issue.labels, ["p1", "bug"]);

  const rel = await github.run({}, {
    githubEvent: "release",
    body: { release: { name: "v1", tag_name: "v1.0.0", prerelease: false, draft: false } },
  });
  assert.equal(rel.tagName, "v1.0.0");
});

test("github passes an unrecognized event through as raw", async () => {
  const out = await github.run({}, { githubEvent: "watch", body: { anything: true } });
  assert.equal(out.event, "watch");
  assert.deepEqual(out.raw, { anything: true });
});

// ── stripe ───────────────────────────────────────────────────────────────────

const chargeBody = {
  id: "evt_1",
  type: "charge.succeeded",
  livemode: false,
  data: { object: { object: "charge", id: "ch_1", amount: 2500, currency: "usd", status: "succeeded", customer: "cus_1", receipt_email: "a@b.c", created: 1767225600, metadata: { orderId: "A1" } } },
};

test("stripe rejects a payload whose signature does not match", async () => {
  const raw = JSON.stringify(chargeBody);
  await assert.rejects(
    () => stripe.run({ webhookSecret: SECRET }, { body: chargeBody, rawBody: raw, signature: sign("tampered", SECRET) }),
    /Invalid webhook signature/,
  );
});

test("stripe accepts a correctly signed payload", async () => {
  const raw = JSON.stringify(chargeBody);
  const out = await stripe.run({ webhookSecret: SECRET }, { body: chargeBody, rawBody: raw, signature: sign(raw, SECRET) });
  assert.equal(out.eventId, "evt_1");
});

test("stripe halts the branch when the event does not match the configured one", async () => {
  const out = await stripe.run({ event: "invoice.paid" }, { body: chargeBody });
  assert.equal(out.__conditionResult, false);
  assert.equal(out.event, "charge.succeeded");
  assert.match(out.reason, /does not match/);
});

test("stripe normalizes amount, currency and timestamps for non-technical users", async () => {
  const out = await stripe.run({}, { body: chargeBody });
  assert.equal(out.amount, 2500);
  assert.equal(out.amountDecimal, "25.00");
  assert.equal(out.currency, "USD");
  assert.equal(out.email, "a@b.c");
  assert.equal(out.createdAt, new Date(1767225600 * 1000).toISOString());
  assert.deepEqual(out.metadata, { orderId: "A1" });
});

test("stripe leaves amountDecimal null when there is no amount", async () => {
  const out = await stripe.run({}, { body: { id: "evt_2", type: "customer.created", data: { object: { object: "customer", id: "cus_2" } } } });
  assert.equal(out.amountDecimal, null);
  assert.equal(out.currency, "");
  assert.deepEqual(out.metadata, {});
});

// ── generic triggers ─────────────────────────────────────────────────────────

test("webhook exposes body, headers, method and query", async () => {
  const out = await webhook.run({}, { body: { a: 1 }, headers: { "x-a": "b" }, method: "PUT", query: { q: "1" } });
  assert.deepEqual(out.body, { a: 1 });
  assert.deepEqual(out.headers, { "x-a": "b" });
  assert.equal(out.method, "PUT");
  assert.deepEqual(out.query, { q: "1" });
  assert.equal(out.triggerType, "webhook");
  assert.ok(!Number.isNaN(Date.parse(out.triggeredAt)));
});

test("webhook defaults to POST and treats a bare payload as the body", async () => {
  const out = await webhook.run({}, { a: 1 });
  assert.equal(out.method, "POST");
  assert.deepEqual(out.body, { a: 1 });
});

test("form surfaces fields and a submission timestamp", async () => {
  const out = await form.run({}, { body: { fields: { email: "a@b.c" } } });
  assert.deepEqual(out.fields, { email: "a@b.c" });
  assert.equal(out.triggerType, "form");
  assert.ok(!Number.isNaN(Date.parse(out.submittedAt)));

  const bare = await form.run({}, { body: { email: "a@b.c" } });
  assert.deepEqual(bare.fields, { email: "a@b.c" });
});

test("manual passes its input through and stamps the run", async () => {
  const out = await manual.run({}, { seeded: true });
  assert.equal(out.seeded, true);
  assert.equal(out.triggerType, "manual");
  assert.ok(!Number.isNaN(Date.parse(out.triggeredAt)));
});

// ── registry contract ────────────────────────────────────────────────────────

test("every trigger module exposes a callable run", async () => {
  const dir = new URL("./", import.meta.url);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js") && !f.includes(".test."));
  assert.ok(files.length >= 40, `only found ${files.length} trigger modules`);
  for (const file of files) {
    const mod = await import(new URL(file, dir).href);
    assert.equal(typeof mod.default?.run, "function", `${file} has no run()`);
  }
});
