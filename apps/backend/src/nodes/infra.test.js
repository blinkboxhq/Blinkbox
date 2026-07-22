import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// The backends below pull config/env.js, which throws at import time when these
// are unset. CI has no .env, so seed them before any dynamic import.
process.env.JWT_SECRET ||= "test-jwt-secret";
process.env.ENCRYPTION_KEY ||= "0123456789abcdef0123456789abcdef";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NODES_DIR = "../../../../packages/nodes";

const readMeta = (name) => import(`${NODES_DIR}/${name}/meta.js`).then((m) => m.default);
const { opsFromMeta } = await import(`${NODES_DIR}/metaOps.js`);

// Concatenate every .js under the given files/dirs so a field-name lookup sees
// the whole backend for a node (slim wrapper + modular _packaged handlers).
function readBackendSource(targets) {
  const out = [];
  const walk = (p) => {
    const abs = path.resolve(__dirname, p);
    if (!fs.existsSync(abs)) return;
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      for (const f of fs.readdirSync(abs)) walk(path.join(p, f));
    } else if (abs.endsWith(".js")) {
      out.push(fs.readFileSync(abs, "utf-8"));
    }
  };
  targets.forEach(walk);
  return out.join("\n");
}

const configKeys = (src) => {
  const keys = new Set([...src.matchAll(/(?:config|input)\.([a-zA-Z][a-zA-Z0-9]*)/g)].map((m) => m[1]));
  // Backends also read config via destructuring: `const { url, method } = config`.
  // Anchor to a declaration keyword so an `import { … }` brace never matches.
  for (const m of src.matchAll(/(?:const|let|var)\s*\{([\s\S]*?)\}\s*=\s*(?:config|input)\b/g)) {
    for (const part of m[1].split(",")) {
      const key = part.split(":")[0].split("=")[0].trim().replace(/^\.\.\./, "");
      if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(key)) keys.add(key);
    }
  }
  return keys;
};

// Fields used only as another field's `show` gate are UI discriminators the
// backend routes on (e.g. sftp authType) — never sent as config.<name>.
const controlFields = (meta) => {
  const deps = new Set();
  const collect = (f) => f.show && Object.keys(f.show).forEach((k) => deps.add(k));
  for (const f of meta.fields) {
    collect(f);
    if (f.type === "row" && Array.isArray(f.fields)) f.fields.forEach(collect);
  }
  return deps;
};

// Framework-owned field names the backend reads through a resolver, not config.<name>.
const SKIP_FIELDS = new Set(["credentialId", "operation"]);

const leafFields = (meta) =>
  meta.fields.flatMap((f) => (f.type === "row" ? f.fields : [f])).filter((f) => f && f.name && f.type !== "notice");

// name → { meta, src dirs/files, ops resolver } for every infra node with a
// meta-driven panel and a real backend.
const NODES = {
  github: { src: ["_packaged/github", "integrations/github.node.js"] },
  sentry: { src: ["_packaged/sentry", "integrations/sentry.node.js"] },
  vercel: { src: ["_packaged/vercel", "integrations/vercel.node.js"] },
  netlify: { src: ["_packaged/netlify", "integrations/netlify.node.js"] },
  pagerduty: { src: ["_packaged/pagerduty", "integrations/pagerduty.node.js"] },
  datadog: { src: ["_packaged/datadog", "integrations/datadog.node.js"] },
  s3: { src: ["_packaged/s3", "integrations/s3.node.js"] },
  sftp: { src: ["_packaged/sftp", "integrations/sftp.node.js"] },
  ssh: { src: ["integrations/ssh.node.js", "_packaged/sftp/GenericFunctions.js"] },
  email_parser: { src: ["emailParser.node.js"] },
  http_request: { src: ["httpRequest.node.js"] },
  translation: { src: ["translation.node.js"] },
  text_to_speech: { src: ["textToSpeech.node.js"] },
  ocr: { src: ["ocr.node.js"] },
};

// Valid backend operations per node: router OPERATIONS ∪ OP_ALIAS keys, or the
// node's own exported/declared list for the two non-router backends.
const ROUTER_NODES = ["github", "sentry", "vercel", "netlify", "pagerduty", "datadog", "s3", "sftp"];

async function validOps(name) {
  if (ROUTER_NODES.includes(name)) {
    const router = await import(`./_packaged/${name}/router.js`);
    const ops = new Set(Object.keys(router.OPERATIONS || {}));
    try {
      const gf = await import(`./_packaged/${name}/GenericFunctions.js`);
      Object.keys(gf.OP_ALIAS || {}).forEach((k) => ops.add(k));
    } catch { /* no alias map for this node */ }
    return ops;
  }
  if (name === "ssh") {
    const ssh = await import("./integrations/ssh.node.js");
    return new Set([...ssh.OPERATIONS, ...Object.keys(ssh.OP_ALIAS || {})]);
  }
  if (name === "email_parser") {
    const src = readBackendSource(["emailParser.node.js"]);
    return new Set([...src.matchAll(/(extract[A-Za-z]+):/g)].map((m) => m[1]));
  }
  return null; // no operation field (http_request, translation, tts, ocr)
}

// ── contract: every infra meta is shaped for the picker + SchemaForm ──────────

test("every infra meta declares backendType, label, description, fields, outputs", async () => {
  for (const name of Object.keys(NODES)) {
    const meta = await readMeta(name);
    assert.ok(meta.backendType, `${name}: missing backendType`);
    assert.ok(meta.label, `${name}: missing label`);
    assert.ok(meta.description, `${name}: missing description`);
    assert.ok(Array.isArray(meta.fields) && meta.fields.length, `${name}: no fields`);
    assert.ok(Array.isArray(meta.outputs) && meta.outputs.length, `${name}: no outputs`);
  }
});

// ── contract: the picker can never offer an op the backend can't run ──────────

test("every meta operation exists in the node's backend operation set", async () => {
  for (const name of Object.keys(NODES)) {
    const ops = opsFromMeta(await readMeta(name)).map((o) => o.value);
    const valid = await validOps(name);
    if (!valid) {
      assert.equal(ops.length, 0, `${name} has no backend op set but its meta declares operations`);
      continue;
    }
    for (const op of ops) {
      assert.ok(valid.has(op), `${name}: meta operation "${op}" is not a backend operation`);
    }
  }
});

// ── contract: every meta field is a config key the backend actually reads ─────

test("every infra meta field name maps to a config key the backend reads", async () => {
  for (const name of Object.keys(NODES)) {
    const meta = await readMeta(name);
    const keys = configKeys(readBackendSource(NODES[name].src));
    const controls = controlFields(meta);
    for (const f of leafFields(meta)) {
      if (SKIP_FIELDS.has(f.name) || controls.has(f.name)) continue;
      assert.ok(keys.has(f.name), `${name}: meta field "${f.name}" is never read as config.${f.name} in the backend`);
    }
  }
});

// ── contract: options-field defaults are themselves valid options ─────────────

test("every options field default is one of its declared options", async () => {
  for (const name of Object.keys(NODES)) {
    const meta = await readMeta(name);
    for (const f of leafFields(meta)) {
      if (f.type !== "options" || f.default === undefined) continue;
      const values = (f.options || []).map((o) => o.value);
      assert.ok(values.includes(f.default), `${name}.${f.name}: default "${f.default}" is not an option`);
    }
  }
});

// ── ssh: destructive remote execution stays gated ─────────────────────────────

test("ssh node refuses to run unless ENABLE_SHELL_TOOLS is enabled", async () => {
  const prev = process.env.ENABLE_SHELL_TOOLS;
  delete process.env.ENABLE_SHELL_TOOLS;
  const ssh = (await import("./integrations/ssh.node.js")).default;
  const out = await ssh.run({ operation: "executeCommand", command: "id" }, {}, {});
  assert.equal(out.skipped, true);
  assert.match(out.error, /ENABLE_SHELL_TOOLS/);
  if (prev !== undefined) process.env.ENABLE_SHELL_TOOLS = prev;
});

// ── opsFromMeta: reads the operation field's options ──────────────────────────

test("opsFromMeta returns the operation field options, or [] when there is none", async () => {
  const github = await readMeta("github");
  const ops = opsFromMeta(github);
  assert.ok(ops.length >= 1 && ops.every((o) => o.value && o.label));
  assert.deepEqual(opsFromMeta({ fields: [{ name: "url", type: "string" }] }), []);
  assert.deepEqual(opsFromMeta({}), []);
});
