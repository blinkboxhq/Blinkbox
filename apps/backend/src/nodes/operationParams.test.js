import test from "node:test";
import assert from "node:assert/strict";
import { deriveOperationParams } from "../../scripts/operationParams.derive.mjs";
import { OPERATION_PARAMS, getOperationParams } from "./operationParams.js";
import { listActions, buildToolSchema } from "./integrationManifest.js";

test("operation params match the handlers — regenerate with `npm run catalog`", async () => {
  const { params } = await deriveOperationParams();
  assert.deepEqual(OPERATION_PARAMS, JSON.parse(JSON.stringify(params)));
});

test("a required key is one the handler refuses to run without", () => {
  assert.equal(getOperationParams("slack", "postMessage").channel.r, true);
  assert.equal(getOperationParams("telegram", "sendMessage").chatId.r, true);
  // `if (!config.body && !config.html)` refuses only when both are missing, so
  // neither is required on its own.
  const mail = getOperationParams("sendgrid", "sendEmail");
  assert.ok(mail.to.r && !mail.body?.r && !mail.html?.r);
});

test("keys a helper names on the config are found, not just config.x reads", () => {
  // buildRawEmail({ to, subject, body, … }) names them in its parameter list.
  const send = getOperationParams("gmail", "sendEmail");
  for (const k of ["to", "subject", "body", "html", "replyTo", "attachments"]) {
    assert.ok(send[k], `gmail.sendEmail lost ${k}`);
  }
  // props(c, CONTACT_MAP) — the map is the written list of accepted keys.
  const contact = getOperationParams("hubspot", "createContact");
  for (const k of ["email", "firstName", "lastName", "phone", "jobTitle"]) {
    assert.ok(contact[k], `hubspot.createContact lost ${k}`);
  }
  // need(c, "contactId", op) hands the key over by name.
  assert.equal(getOperationParams("hubspot", "deleteContact").contactId.r, true);
});

test("a type is only reported when the source implies one", () => {
  assert.equal(getOperationParams("stripe", "createCustomer").metadata.t, "object");
  assert.equal(getOperationParams("github", "createIssue").milestone.t, "number");
  assert.equal(getOperationParams("slack", "postMessage").unfurlLinks.t, "boolean");
  // No evidence either way — better absent than guessed.
  assert.equal(getOperationParams("hubspot", "createContact").email.t, undefined);
});

test("no method name or internal is mistaken for a config key", () => {
  const reserved = ["operation", "credentialId", "credential", "workspaceId", "executionId"];
  for (const [type, ops] of Object.entries(OPERATION_PARAMS)) {
    for (const [op, keys] of Object.entries(ops)) {
      for (const k of Object.keys(keys)) {
        assert.ok(!reserved.includes(k), `${type}.${op} lists the reserved key ${k}`);
        assert.ok(!k.startsWith("_"), `${type}.${op} lists the internal ${k}`);
      }
      assert.ok(Object.keys(keys).length <= 25, `${type}.${op} claims an implausible ${Object.keys(keys).length} params`);
    }
  }
});

test("listActions exposes derived params and marks them derived", async () => {
  const post = (await listActions("slack")).find((a) => a.key === "postMessage");
  assert.equal(post.derived, true);
  assert.deepEqual(post.required.sort(), ["channel", "text"]);
  assert.ok(post.params.channel, "params lost the channel key");
});

test("typed properties never close the passthrough escape hatch", async () => {
  const schema = await buildToolSchema("slack", ["postMessage"]);
  assert.ok(schema.parameters.properties.channel, "typed param missing");
  assert.ok(
    schema.parameters.properties.params,
    "a key derivation cannot see would be unreachable",
  );
  assert.deepEqual(schema.parameters.required, ["operation"]);
});
