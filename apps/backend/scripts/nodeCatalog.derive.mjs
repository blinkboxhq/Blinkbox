// Derives the picker-visible node catalog from the frontend pickers.
//
// Picker visibility is declared in frontend source, but the MCP connector and
// Brian both need it server-side — so it is derived here into a checked-in
// module (src/nodes/nodeCatalog.js) rather than imported across app boundaries
// at runtime. nodeCatalog.test.js re-runs this and fails on drift.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.join(HERE, "..");
const WORKSPACE = path.join(BACKEND, "../frontend/src/pages/Workspace");

const read = (p) => fs.readFileSync(p, "utf8");

// Splits a top-level object literal into { key -> raw source chunk } so single
// fields can be pulled without evaluating frontend modules (they import JSX).
function chunkEntries(src, startMarker) {
  const body = src.slice(src.indexOf(startMarker));
  const marks = [...body.matchAll(/^ {2}([a-zA-Z0-9_]+):\s*\{/gm)];
  const out = new Map();
  marks.forEach((m, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].index : body.length;
    out.set(m[1], body.slice(m.index, end));
  });
  return out;
}

const field = (chunk, name) =>
  (chunk.match(new RegExp(`${name}:\\s*["']([^"']+)["']`)) || [])[1] || null;

const PROVIDER_BY_TYPE = {
  slack: "slack",
  gmail: "google",
  youtube: "google",
  microsoft: "microsoft",
  outlook: "microsoft",
  teams: "microsoft",
  onedrive: "microsoft",
  microsoft_todo: "microsoft",
  github: "github",
  airtable: "airtable",
  notion: "notion",
  whatsapp: "meta",
  meta: "meta",
};

export function oauthProviderFor(key) {
  const base = String(key || "").toLowerCase().replace(/_trigger$/, "");
  if (PROVIDER_BY_TYPE[base]) return PROVIDER_BY_TYPE[base];
  if (base.startsWith("google")) return "google";
  return null;
}

export function derive() {
  // ── frontend NodeRegistry: label / category / agentOnly ────────────────────
  const registry = chunkEntries(
    read(path.join(WORKSPACE, "nodeRegistry.js")),
    "export const NodeRegistry = {",
  );
  const meta = new Map();
  for (const [key, chunk] of registry) {
    meta.set(key, {
      label: field(chunk, "label"),
      category: field(chunk, "category"),
      agentOnly: /agentOnly:\s*true/.test(chunk),
    });
  }

  // ── action picker (AddNodeSidebar) ─────────────────────────────────────────
  const actionPicker = [...meta.keys()].filter(
    (k) => meta.get(k).category !== "trigger" && !meta.get(k).agentOnly,
  );

  // ── trigger picker (triggerVariants -> backendType) ────────────────────────
  const variants = read(path.join(WORKSPACE, "triggerVariants.js"));
  const triggerPicker = [
    ...new Set([...variants.matchAll(/backendType:\s*["']([^"']+)["']/g)].map((m) => m[1])),
  ];
  const variantLabels = new Map();
  for (const [key, chunk] of chunkEntries(variants, "export const TRIGGER_VARIANTS = {")) {
    const bt = field(chunk, "backendType");
    if (bt) variantLabels.set(bt, field(chunk, "label") || key);
  }

  // ── agent picker (AGENT_CATEGORIES) ────────────────────────────────────────
  const agentSrc = read(path.join(WORKSPACE, "components/AgentPicker.jsx"));
  const tools = (agentSrc.match(/const AGENT_TOOLS = \[([\s\S]*?)\]/)?.[1] || "")
    .match(/"([^"]+)"/g)
    ?.map((s) => s.slice(1, -1)) || [];
  const agentSlots = new Map();
  const agentPicker = [];
  for (const m of agentSrc.matchAll(
    /\{\s*id:\s*"([a-z_]+)"[\s\S]{0,200}?slotId:\s*"([a-z_]+)",\s*nodes:\s*(\[[^\]]*\]|AGENT_TOOLS)/g,
  )) {
    const keys = m[3] === "AGENT_TOOLS" ? tools : [...m[3].matchAll(/"([^"]+)"/g)].map((q) => q[1]);
    for (const k of keys) {
      if (!agentSlots.has(k)) agentSlots.set(k, m[2]);
      agentPicker.push(k);
    }
  }

  // ── backend: which keys actually execute ───────────────────────────────────
  const indexSrc = read(path.join(BACKEND, "src/nodes/index.js"));
  const registryBlock = indexSrc.slice(
    indexSrc.indexOf("const rawNodeRegistry = {"),
    indexSrc.indexOf("const POLLUTION_KEYS"),
  );
  const executable = new Set(
    [...registryBlock.matchAll(/^ {2}([a-zA-Z0-9_]+):\s*[a-zA-Z]/gm)].map((m) => m[1]),
  );

  // ── backend: which keys have an operation router (agent-usable app) ────────
  const packagedRoot = path.join(BACKEND, "src/nodes/_packaged");
  const integrationsRoot = path.join(BACKEND, "src/nodes/integrations");
  const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  const typeOf = (b) => (b === "redis" ? "redis_node" : snake(b));
  const routers = new Set();
  for (const d of fs.readdirSync(packagedRoot, { withFileTypes: true })) {
    if (d.isDirectory() && fs.existsSync(path.join(packagedRoot, d.name, "router.js"))) {
      routers.add(typeOf(d.name));
    }
  }
  const nodeFiles = new Set(
    fs.readdirSync(integrationsRoot)
      .filter((f) => f.endsWith(".node.js"))
      .map((f) => typeOf(f.slice(0, -8))),
  );
  const integrations = new Set([...routers].filter((t) => nodeFiles.has(t)));

  // ── backend: which keys have a config field schema (Brian's KB) ────────────
  const kb = read(path.join(BACKEND, "src/modules/brian/brian.nodes.js"));
  const documented = new Set(
    [...kb.matchAll(/^ {2}([a-zA-Z0-9_]+):\s*\{/gm)].map((m) => m[1]),
  );

  const pickersOf = (key) => {
    const p = [];
    if (actionPicker.includes(key)) p.push("action");
    if (triggerPicker.includes(key)) p.push("trigger");
    if (agentPicker.includes(key)) p.push("agent");
    return p;
  };

  const keys = [...new Set([...actionPicker, ...triggerPicker, ...agentPicker])].sort();
  const nodes = keys.map((key) => {
    const m = meta.get(key) || {};
    const base = key.replace(/_trigger$/, "");
    const entry = {
      key,
      label: m.label || variantLabels.get(key) || key,
      category: m.category || (triggerPicker.includes(key) ? "trigger" : null),
      pickers: pickersOf(key),
      executable: executable.has(key),
      documented: documented.has(key),
    };
    if (agentSlots.has(key)) entry.agentSlot = agentSlots.get(key);
    const integrationType = integrations.has(key) ? key : integrations.has(base) ? base : null;
    if (integrationType) entry.integration = integrationType;
    const provider = oauthProviderFor(key);
    if (provider) entry.oauthProvider = provider;
    return entry;
  });

  return { nodes };
}
