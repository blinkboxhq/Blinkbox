import { test } from "node:test";
import assert from "node:assert/strict";

// App handlers hit the network, but the request-shaping and escaping helpers
// they funnel through are pure — that is where the injection and leak bugs live.
const telegram = await import("./_packaged/telegram/GenericFunctions.js");
const gmail = await import("./_packaged/gmail/GenericFunctions.js");
const drive = await import("./_packaged/googleDrive/GenericFunctions.js");
const notion = await import("./_packaged/notion/GenericFunctions.js");
const stripe = await import("./_packaged/stripe/GenericFunctions.js");
const sendgrid = await import("./_packaged/sendgrid/GenericFunctions.js");
const discord = await import("./_packaged/discord/GenericFunctions.js");
const twilio = await import("./_packaged/twilio/GenericFunctions.js");
const jira = await import("./_packaged/jira/GenericFunctions.js");

// ── telegram ─────────────────────────────────────────────────────────────────

test("telegram never lets a bot token reach an error message", () => {
  const leaked = "Request failed for https://api.telegram.org/bot123456:AAH-SECRET/sendMessage";
  const safe = telegram.redactToken(leaked);
  assert.ok(!safe.includes("AAH-SECRET"), safe);
  assert.ok(safe.includes("/bot<redacted>"));

  assert.throws(
    () => telegram.handleError({ message: "x", response: { status: 400, data: { description: "/bot99:TOKEN/x bad" } } }),
    (err) => !err.message.includes("TOKEN"),
  );
});

test("telegram maps API status codes to actionable messages", () => {
  const cases = [
    [401, /Invalid Bot Token/],
    [403, /not a member of this chat/],
    [429, /Rate limit/],
  ];
  for (const [status, re] of cases) {
    assert.throws(() => telegram.handleError({ message: "x", response: { status } }), re, String(status));
  }
});

test("telegram rejects attachments over the upload limit and passes small ones", () => {
  const big = "A".repeat(Math.ceil((telegram.MAX_UPLOAD_BYTES + 1024 * 1024) * 4 / 3));
  const rejected = telegram.attachmentTooLarge(big, "sendDocument");
  assert.equal(rejected.skipped, true);
  assert.match(rejected.error, /over the 50MB upload limit/);

  assert.equal(telegram.attachmentTooLarge("A".repeat(1000), "sendDocument"), null);
});

test("telegram flattens the API envelope into a usable result", () => {
  const out = telegram.msgResult({ ok: true, result: { message_id: 5, chat: { id: 9, type: "group", title: "Ops" } } });
  assert.deepEqual(out, { ok: true, messageId: 5, chat: { id: 9, type: "group", title: "Ops" } });
});

// ── gmail ────────────────────────────────────────────────────────────────────

const decodeRaw = (raw) => Buffer.from(raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();

test("gmail refuses header injection through any address or subject field", () => {
  for (const field of ["to", "subject", "from", "replyTo"]) {
    assert.throws(
      () => gmail.buildRawEmail({ to: "a@b.c", subject: "hi", [field]: "x\r\nBcc: evil@attacker.test" }),
      /must not contain line breaks/,
      field,
    );
  }
});

test("gmail builds a valid RFC822 message with the right content type", () => {
  const text = decodeRaw(gmail.buildRawEmail({ to: "a@b.c", subject: "Hello", body: "Hi there" }));
  assert.match(text, /^From: me\r\n/);
  assert.match(text, /To: a@b\.c\r\n/);
  assert.match(text, /Subject: Hello\r\n/);
  assert.match(text, /Content-Type: text\/plain; charset=UTF-8/);
  assert.ok(text.endsWith("Hi there"));

  const htmlMail = decodeRaw(gmail.buildRawEmail({ to: "a@b.c", body: "<b>x</b>", html: true }));
  assert.match(htmlMail, /Content-Type: text\/html; charset=UTF-8/);
});

test("gmail sanitizes attachment filenames and unknown mime types", () => {
  const text = decodeRaw(gmail.buildRawEmail({
    to: "a@b.c",
    body: "see attached",
    attachments: [{ name: 'ev\r\nil".txt', mimeType: "not a mime type", dataUrl: "data:text/plain;base64,aGk=" }],
  }));
  assert.ok(!/ev\r\nil/.test(text));
  assert.match(text, /filename="evil\\"\.txt"/);
  assert.match(text, /Content-Type: application\/octet-stream/);
  assert.match(text, /multipart\/mixed; boundary="bb_boundary_/);
});

test("gmail base64url output carries no padding or url-unsafe characters", () => {
  const raw = gmail.buildRawEmail({ to: "a@b.c", subject: "x".repeat(37), body: "y" });
  assert.ok(!/[+/=]/.test(raw), raw.slice(0, 40));
});

// ── google drive ─────────────────────────────────────────────────────────────

test("google drive escapes quotes so a filename cannot break out of a query", () => {
  assert.equal(drive.esc("it's"), "it\\'s");
  assert.equal(drive.esc("a\\b"), "a\\\\b");
  assert.equal(drive.esc("' or name != '"), "\\' or name != \\'");
});

// ── notion ───────────────────────────────────────────────────────────────────

test("notion accepts a page URL or a raw id and normalizes both", () => {
  const bare = "a1b2c3d4e5f6478890abcdef12345678";
  assert.equal(notion.stripId("a1b2c3d4-e5f6-4788-90ab-cdef12345678"), bare);
  assert.equal(notion.stripId("https://notion.so/workspace/a1b2c3d4-e5f6-4788-90ab-cdef12345678"), bare);
});

test("notion names the offending field when JSON is malformed", () => {
  assert.deepEqual(notion.parseJSON({ a: 1 }, "createPage", "properties"), { a: 1 });
  assert.equal(notion.parseJSON(null, "createPage", "properties"), null);
  assert.throws(
    () => notion.parseJSON("{nope", "createPage", "properties"),
    /Notion createPage: 'properties' must be valid JSON/,
  );
});

// ── stripe ───────────────────────────────────────────────────────────────────

test("stripe flattens nested objects and arrays into bracket form", () => {
  const params = stripe.flatten({
    amount: 500,
    metadata: { orderId: "A1" },
    items: [{ price: "p_1", quantity: 2 }, "plain"],
  });
  assert.equal(params.get("amount"), "500");
  assert.equal(params.get("metadata[orderId]"), "A1");
  assert.equal(params.get("items[0][price]"), "p_1");
  assert.equal(params.get("items[0][quantity]"), "2");
  assert.equal(params.get("items[1]"), "plain");
});

test("stripe drops empty values rather than sending blanks", () => {
  const params = stripe.flatten({ a: 1, b: null, c: undefined, d: "" });
  assert.equal(params.get("a"), "1");
  for (const k of ["b", "c", "d"]) assert.equal(params.get(k), null, k);
});

test("stripe metadata tolerates a JSON string, an object, or garbage", () => {
  assert.deepEqual(stripe.metadata({ metadata: { a: 1 } }), { a: 1 });
  assert.deepEqual(stripe.metadata({ metadata: '{"a":1}' }), { a: 1 });
  assert.equal(stripe.metadata({ metadata: "not json" }), undefined);
  assert.equal(stripe.metadata({}), undefined);
});

// ── sendgrid ─────────────────────────────────────────────────────────────────

test("sendgrid splits a display name off an address", () => {
  assert.deepEqual(sendgrid.parseAddress("Ada Lovelace <ada@example.com>"), { name: "Ada Lovelace", email: "ada@example.com" });
  assert.deepEqual(sendgrid.parseAddress("  ada@example.com  "), { email: "ada@example.com" });
});

// ── discord ──────────────────────────────────────────────────────────────────

test("discord only accepts genuine discord webhook urls", () => {
  assert.equal(discord.validateWebhook("https://discord.com/api/webhooks/123/abc"), undefined);
  assert.equal(discord.validateWebhook("").skipped, true);
  for (const bad of ["https://evil.test/api/webhooks/123/abc", "http://discord.com/api/webhooks/1/a"]) {
    assert.throws(() => discord.validateWebhook(bad), /Invalid webhook URL/, bad);
  }
});

test("discord returns the webhook id and never the secret token", () => {
  assert.equal(discord.webhookId("https://discord.com/api/webhooks/987/s3cret-token"), "987");
  assert.equal(discord.webhookId("https://discord.com/api/webhooks/987/s3cret-token?wait=true"), "987");
  assert.equal(discord.webhookId("https://discord.com/api/webhooks/987"), "987");
});

// ── twilio ───────────────────────────────────────────────────────────────────

test("twilio percent-encodes form bodies", () => {
  assert.equal(
    twilio.encodeForm({ To: "+1 555", Body: "hi&bye=ok" }),
    "To=%2B1%20555&Body=hi%26bye%3Dok",
  );
});

// ── jira ─────────────────────────────────────────────────────────────────────

test("jira wraps plain text in an Atlassian document", () => {
  assert.deepEqual(jira.adf("hello"), {
    type: "doc",
    version: 1,
    content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }],
  });
});

// ── router contracts ─────────────────────────────────────────────────────────

const APP_PACKAGES = [
  "telegram", "whatsapp", "slack", "discord", "gmail", "twilio", "sendgrid",
  "airtable", "googleSheets", "notion", "googleCalendar", "googleDrive",
  "jira", "linear", "stripe", "hubspot", "shopify",
];

test("every app router exposes a callable operation map with a valid default", async () => {
  for (const name of APP_PACKAGES) {
    const mod = await import(`./_packaged/${name}/router.js`);
    assert.ok(Object.keys(mod.OPERATIONS ?? {}).length > 0, `${name} has no operations`);
    assert.ok(
      mod.OPERATIONS[mod.DEFAULT_OPERATION],
      `${name} default '${mod.DEFAULT_OPERATION}' is not one of its operations`,
    );
    for (const [op, handler] of Object.entries(mod.OPERATIONS)) {
      assert.equal(typeof handler, "function", `${name}.${op} is not callable`);
    }
  }
});

test("every app router handles an unknown operation instead of crashing", async () => {
  for (const name of APP_PACKAGES) {
    const mod = await import(`./_packaged/${name}/router.js`);
    let out;
    try {
      out = await mod.run({ operation: "definitelyNotAnOperation" }, "fake-token");
    } catch (err) {
      assert.match(err.message, /nknown operation|not.*found/i, name);
      continue;
    }
    assert.equal(out?.skipped ?? out?.success === false, true, `${name} silently accepted an unknown operation`);
  }
});
