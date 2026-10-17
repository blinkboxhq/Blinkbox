import { test } from "node:test";
import assert from "node:assert/strict";
import { isDbFullError } from "./dbErrors.js";

test("recognises Atlas over-quota and full-disk write errors", () => {
  assert.equal(isDbFullError({ code: 8000, codeName: "AtlasError", message: "you are over your space quota, using 512 MB of 512 MB" }), true);
  assert.equal(isDbFullError({ message: "boom", errorResponse: { code: 8000 } }), true);
  assert.equal(isDbFullError({ message: "bulk failed", writeErrors: [{ errmsg: "you are over your space quota" }] }), true);
  assert.equal(isDbFullError(new Error("wrap", { cause: new Error("No space left on device") })), true);
});

test("ignores unrelated errors", () => {
  assert.equal(isDbFullError(new Error("E11000 duplicate key error")), false);
  assert.equal(isDbFullError(new Error("Workspace credit quota exceeded")), false);
  assert.equal(isDbFullError(null), false);
});
