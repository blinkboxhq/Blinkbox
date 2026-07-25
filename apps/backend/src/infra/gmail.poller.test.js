import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGmailQuery } from "./gmail.poller.js";

test("excludes the account's own mail so a sent reply cannot retrigger the workflow", () => {
  assert.equal(buildGmailQuery({ query: "in:inbox" }), "in:inbox -in:sent -in:draft -in:chats");
});

test("still excludes own mail when no query is configured", () => {
  assert.equal(buildGmailQuery({}), "is:unread -in:sent -in:draft -in:chats");
});

test("keeps friendly filters and appends the exclusion once", () => {
  assert.equal(
    buildGmailQuery({ query: "is:unread", fromEmail: "a@b.com", subjectKeyword: "invoice" }),
    "is:unread from:a@b.com subject:(invoice) -in:sent -in:draft -in:chats",
  );
});

test("respects an explicit opt-in to own mail", () => {
  assert.equal(buildGmailQuery({ query: "in:sent" }), "in:sent");
  assert.equal(buildGmailQuery({ query: "in:anywhere is:unread" }), "in:anywhere is:unread");
});
