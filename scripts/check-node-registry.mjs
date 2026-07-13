#!/usr/bin/env node
/**
 * check-node-registry.mjs — frontend/backend node registry drift report.
 *
 * Compares the keys of the frontend NodeRegistry
 * (apps/frontend/src/pages/Workspace/nodeRegistry.js) against the backend
 * executable registry (apps/backend/src/nodes/index.js). A frontend key with
 * no backend counterpart means the node renders on the canvas but fails at
 * execution time; a backend-only key is unreachable from the UI (often an
 * intentional alias).
 *
 * Extraction is regex/indentation-based on purpose — the frontend registry is
 * a 2700-line JSX-adjacent file we do not want to evaluate, and importing the
 * backend index would run installHttpHardening() and other side effects.
 * Spreads inside the backend registry (...coreNodes etc.) are resolved one
 * level deep by reading the referenced module's `export { default as key }` /
 * `export const key` statements. Treat results as a visibility report, not a
 * proof.
 *
 * Usage:
 *   node scripts/check-node-registry.mjs            # report only, exit 0
 *   node scripts/check-node-registry.mjs --strict   # exit 1 on suspicious
 *                                                   # frontend-only keys
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FRONTEND_REGISTRY = path.join(ROOT, "apps/frontend/src/pages/Workspace/nodeRegistry.js");
const BACKEND_REGISTRY = path.join(ROOT, "apps/backend/src/nodes/index.js");
const STRICT = process.argv.includes("--strict");

// Known/suspected aliases: frontend key -> backend key it likely maps to.
// Reported, never auto-fixed.
const KNOWN_ALIASES = {
  webhook_response: "respond_webhook",
  graphql: "graphql_request",
  rss_feed: "rss",
  rss_feed_generator: "rss",
};

// Frontend keys that are handled by canvas/UI machinery rather than a
// backend handler lookup — never suspicious on their own.
const UI_ONLY_HINTS = new Set(["sticky_note", "note", "group"]);

// Frontend keys consumed through agent edge handles (cursor.executor.js reads
// their node.data via the "integration"/"skills" handles and never does a
// registry lookup), so a missing backend key is expected.
const HANDLE_CONSUMED = (key) => key.startsWith("agent_integration_") || key === "agent_skill";

const KEY_LINE = /^ {2}(["']?)([A-Za-z_$][\w$]*)\1:\s*/;
const SPREAD_LINE = /^ {2}\.\.\.([A-Za-z_$][\w$]*)/;
const SPREAD_FROMENTRIES = /^ {2}\.\.\.Object\.fromEntries\(Object\.entries\((\w+)\)/;

// Collects keys declared at the top level of an object literal that starts on
// the line matching `anchor` and ends at the first line that is exactly `};`.
function sliceObjectLiteral(source, anchor) {
  const lines = source.split("\n");
  const start = lines.findIndex((l) => l.includes(anchor));
  if (start === -1) throw new Error(`Anchor not found: ${anchor}`);
  const end = lines.findIndex((l, i) => i > start && l.trim() === "};");
  if (end === -1) throw new Error(`Closing }; not found after: ${anchor}`);
  return lines.slice(start + 1, end);
}

function extractFrontendKeys(source) {
  const keys = new Set();
  // Frontend entries are `  key: {` — requiring the brace skips nested props.
  for (const line of sliceObjectLiteral(source, "export const NodeRegistry = {")) {
    const m = line.match(/^ {2}(["']?)([A-Za-z_$][\w$]*)\1:\s*\{/);
    if (m) keys.add(m[2]);
  }
  return keys;
}

async function extractBackendKeys(source) {
  const keys = new Set();
  const spreads = [];
  for (const line of sliceObjectLiteral(source, "const rawNodeRegistry = {")) {
    const fe = line.match(SPREAD_FROMENTRIES);
    const sp = fe ? fe : line.match(SPREAD_LINE);
    if (sp) {
      spreads.push(sp[1]);
      continue;
    }
    const m = line.match(KEY_LINE);
    if (m) keys.add(m[2]);
  }

  // Resolve `import * as name from "path"` one level deep.
  const importMap = {};
  for (const m of source.matchAll(/import \* as (\w+)\s+from\s+"(\.[^"]+)"/g)) {
    importMap[m[1]] = m[2];
  }
  for (const ns of spreads) {
    const rel = importMap[ns];
    if (!rel) {
      console.warn(`  (warn) could not resolve spread ...${ns} — keys from it are not counted`);
      continue;
    }
    const modPath = path.resolve(path.dirname(BACKEND_REGISTRY), rel);
    const modSource = await readFile(modPath, "utf8");
    for (const m of modSource.matchAll(/export\s+\{\s*default\s+as\s+([A-Za-z_$][\w$]*)\s*\}/g)) {
      keys.add(m[1]);
    }
    for (const m of modSource.matchAll(/^export const ([A-Za-z_$][\w$]*)\s*=/gm)) {
      keys.add(m[1]);
    }
  }
  return keys;
}

const normalize = (k) => k.toLowerCase().replace(/[_-]/g, "");

function findAlias(feKey, backendKeys, backendByNorm) {
  if (KNOWN_ALIASES[feKey] && backendKeys.has(KNOWN_ALIASES[feKey])) {
    return { to: KNOWN_ALIASES[feKey], via: "known alias map" };
  }
  const norm = backendByNorm.get(normalize(feKey));
  if (norm && norm !== feKey) return { to: norm, via: "name normalization" };
  return null;
}

const [feSource, beSource] = await Promise.all([
  readFile(FRONTEND_REGISTRY, "utf8"),
  readFile(BACKEND_REGISTRY, "utf8"),
]);

const frontendKeys = extractFrontendKeys(feSource);
const backendKeys = await extractBackendKeys(beSource);

const backendByNorm = new Map([...backendKeys].map((k) => [normalize(k), k]));
const inBoth = [...frontendKeys].filter((k) => backendKeys.has(k));
const frontendOnly = [...frontendKeys].filter((k) => !backendKeys.has(k)).sort();
const backendOnly = [...backendKeys].filter((k) => !frontendKeys.has(k)).sort();

const aliased = [];
const suspicious = [];
const handleConsumed = [];
for (const key of frontendOnly) {
  const alias = findAlias(key, backendKeys, backendByNorm);
  if (alias) aliased.push({ key, ...alias });
  else if (HANDLE_CONSUMED(key)) handleConsumed.push(key);
  else if (!UI_ONLY_HINTS.has(key)) suspicious.push(key);
}

console.log("── Node registry drift report ──────────────────────────────");
console.log(`frontend keys : ${frontendKeys.size}`);
console.log(`backend keys  : ${backendKeys.size}`);
console.log(`in both       : ${inBoth.length}`);
console.log(`frontend-only : ${frontendOnly.length}`);
console.log(`backend-only  : ${backendOnly.length}  (often intentional aliases/agent tools)`);

if (aliased.length) {
  console.log("\nPossible aliases (no action taken):");
  for (const a of aliased) {
    console.log(`  Possible alias: frontend "${a.key}" may map to backend "${a.to}" (${a.via})`);
  }
}

if (handleConsumed.length) {
  console.log(`\nHandle-consumed agent nodes (no registry lookup — OK): ${handleConsumed.length}`);
}

if (suspicious.length) {
  console.log("\nFrontend-only keys with NO backend match (would fail at execution):");
  for (const k of suspicious) console.log(`  - ${k}`);
} else {
  console.log("\nNo suspicious frontend-only keys found.");
}

if (backendOnly.length) {
  console.log("\nBackend-only keys (unreachable from the canvas UI — informational):");
  console.log(`  ${backendOnly.join(", ")}`);
}

console.log("─────────────────────────────────────────────────────────────");

if (STRICT && suspicious.length) {
  console.error(`\n--strict: ${suspicious.length} suspicious frontend-only key(s). Failing.`);
  process.exit(1);
}
process.exit(0);
