import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { resolveCredential } from "./resolveCredential.js";
import Credential from "../models/credential.model.js";

let mongod;
let credA;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  credA = await Credential.create({
    workspaceId: "workspace-A",
    name: "Slack Bot Token",
    type: "bearer",
    encryptedData: "deadbeef",
    iv: "00112233445566778899aabbccddeeff",
    authTag: "ffeeddccbbaa99887766554433221100",
  });
});
after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

test("resolves a credential by _id within its own workspace", async () => {
  const cred = await resolveCredential(credA._id.toString(), "workspace-A", "TestNode");
  assert.equal(cred._id.toString(), credA._id.toString());
  assert.equal(cred.encryptedData, "deadbeef", "returned still encrypted — resolver never decrypts");
});

test("credential from another workspace cannot be resolved by _id", async () => {
  await assert.rejects(
    () => resolveCredential(credA._id.toString(), "workspace-B", "TestNode"),
    /not found.*belongs to this workspace/s,
  );
});

test("name-fallback lookup is also workspace-scoped", async () => {
  const byName = await resolveCredential("slack bot token", "workspace-A", "TestNode");
  assert.equal(byName._id.toString(), credA._id.toString());

  await assert.rejects(
    () => resolveCredential("slack bot token", "workspace-B", "TestNode"),
    /not found/,
  );
});

test("missing credentialId or workspace context is rejected up front", async () => {
  await assert.rejects(() => resolveCredential(null, "workspace-A", "TestNode"), /'credentialId' is required/);
  await assert.rejects(
    () => resolveCredential(credA._id.toString(), null, "TestNode"),
    /without a workspace context/,
  );
});
