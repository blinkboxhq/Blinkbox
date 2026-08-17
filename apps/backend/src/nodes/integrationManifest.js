/**
 * Integration manifest — single source of truth for "what can this app do?"
 *
 * Every packaged integration exports OPERATIONS (opKey -> handler). Richer apps
 * also export OPERATION_SCHEMA (opKey -> { label, description, params, scopes })
 * which lets us derive LLM tool schemas, the action checklist and the OAuth
 * scope union without hand-maintaining a second copy of the same knowledge.
 *
 * Apps without an OPERATION_SCHEMA still work: their operations are humanised
 * from the OPERATIONS keys, and their arguments come from OPERATION_PARAMS —
 * derived from the handlers themselves, since no app hand-declares `params`.
 * The passthrough `params` object stays open behind the derived ones because
 * static derivation can miss a key it cannot see.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getOperationParams } from "./operationParams.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGED_ROOT = path.join(HERE, "_packaged");
const INTEGRATIONS_ROOT = path.join(HERE, "integrations");

// packaged dir / node file basename -> integration type (backend registry key)
const TYPE_OVERRIDES = {
  redis: "redis_node",
};

const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
const typeOf = (basename) => TYPE_OVERRIDES[basename] || snake(basename);

export const humanize = (key) =>
  String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

let _dirIndex = null;
function dirIndex() {
  if (_dirIndex) return _dirIndex;
  const packaged = {};
  const nodes = {};
  try {
    for (const d of fs.readdirSync(PACKAGED_ROOT, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      if (!fs.existsSync(path.join(PACKAGED_ROOT, d.name, "router.js"))) continue;
      packaged[typeOf(d.name)] = d.name;
    }
  } catch { /* packaged dir missing — manifest degrades to empty */ }
  try {
    for (const f of fs.readdirSync(INTEGRATIONS_ROOT)) {
      if (!f.endsWith(".node.js")) continue;
      nodes[typeOf(f.slice(0, -8))] = f;
    }
  } catch { /* ignore */ }
  _dirIndex = { packaged, nodes };
  return _dirIndex;
}

// An app is only usable as an agent tool if it has BOTH an operation router and
// a node entry — the node is what resolves the credential the router needs.
export function isKnownIntegration(type) {
  const { packaged, nodes } = dirIndex();
  return Boolean(packaged[type] && nodes[type]);
}

export function listIntegrationTypes() {
  return Object.keys(dirIndex().packaged).filter(isKnownIntegration).sort();
}

const _routerCache = new Map();
async function loadRouter(type) {
  if (_routerCache.has(type)) return _routerCache.get(type);
  const dir = dirIndex().packaged[type];
  let mod = null;
  if (dir) {
    try {
      mod = await import(`./_packaged/${dir}/router.js`);
    } catch (err) {
      console.error(`[IntegrationManifest] Failed to load router for "${type}": ${err.message}`);
    }
  }
  _routerCache.set(type, mod);
  return mod;
}

const _nodeCache = new Map();
async function loadNode(type) {
  if (_nodeCache.has(type)) return _nodeCache.get(type);
  const file = dirIndex().nodes[type];
  let mod = null;
  if (file) {
    try {
      mod = (await import(`./integrations/${file}`)).default;
    } catch (err) {
      console.error(`[IntegrationManifest] Failed to load node for "${type}": ${err.message}`);
    }
  }
  _nodeCache.set(type, mod);
  return mod;
}

/**
 * All operations an integration exposes.
 * -> [{ key, label, description, params, scopes, recommended }]
 */
export async function listActions(type) {
  const mod = await loadRouter(type);
  if (!mod) return [];
  const schema = mod.OPERATION_SCHEMA || {};
  const keys = Object.keys(mod.OPERATIONS || {});
  const fallbackDefault = mod.DEFAULT_OPERATION;
  return keys.map((key) => {
    const s = schema[key] || {};
    const derived = s.params ? null : derivedParams(type, key);
    return {
      key,
      label: s.label || humanize(key),
      description: s.description || "",
      params: s.params || derived?.params || null,
      required: derived?.required || paramsRequired(s.params),
      derived: Boolean(derived),
      scopes: Array.isArray(s.scopes) ? s.scopes : [],
      recommended: s.recommended === true || key === fallbackDefault,
    };
  });
}

function paramsRequired(params) {
  return params ? Object.keys(params).filter((k) => params[k]?.required) : [];
}

// The config keys the handler is seen to read, as JSON-schema properties. A key
// with no inferable type stays untyped rather than being guessed at.
function derivedParams(type, key) {
  const d = getOperationParams(type, key);
  if (!d) return null;
  const params = {};
  const required = [];
  for (const [name, meta] of Object.entries(d)) {
    params[name] = meta.t ? { type: meta.t } : {};
    if (meta.r) required.push(name);
  }
  return { params, required };
}

export async function defaultOperation(type) {
  const mod = await loadRouter(type);
  return mod?.DEFAULT_OPERATION || null;
}

/** Union of OAuth scopes required by the ticked actions. */
export async function scopeUnion(type, enabledActions) {
  const actions = await listActions(type);
  const wanted = Array.isArray(enabledActions) && enabledActions.length
    ? new Set(enabledActions)
    : null;
  const out = new Set();
  for (const a of actions) {
    if (wanted && !wanted.has(a.key)) continue;
    for (const s of a.scopes) out.add(s);
  }
  return [...out];
}

const PASSTHROUGH_PARAMS = {
  params: {
    type: "object",
    description:
      "Operation arguments as key/value pairs, exactly as the integration expects them (e.g. { channel: '#general', text: 'hi' }).",
  },
};

// Requirements differ per operation, so JSON-schema `required` can only carry
// `operation` itself — the rest of each op's contract is spelled out here.
const describeAction = (a) =>
  `${a.key}${a.description ? ` — ${a.description}` : ""}` +
  (a.required?.length ? ` (needs: ${a.required.join(", ")})` : "");

/**
 * JSON-schema tool definition for an app, restricted to the ticked actions.
 * Ops that declare `params` contribute typed properties; anything else falls
 * back to a single free-form `params` object.
 */
export async function buildToolSchema(type, enabledActions) {
  const all = await listActions(type);
  if (!all.length) return null;
  const wanted = Array.isArray(enabledActions) && enabledActions.length
    ? all.filter((a) => enabledActions.includes(a.key))
    : all;
  const actions = wanted.length ? wanted : all;

  const properties = {
    operation: {
      type: "string",
      enum: actions.map((a) => a.key),
      description: actions.map(describeAction).join("; "),
    },
  };
  const required = ["operation"];
  let untyped = false;
  for (const a of actions) {
    if (!a.params) { untyped = true; continue; }
    // Derivation reports the keys a handler is seen to read; one it cannot see
    // statically would otherwise become unreachable, so the free-form escape
    // hatch stays open alongside the typed properties.
    if (a.derived) untyped = true;
    for (const [name, def] of Object.entries(a.params)) {
      if (properties[name]) continue;
      const { required: _req, ...rest } = def || {};
      properties[name] = rest;
    }
  }
  if (untyped) Object.assign(properties, PASSTHROUGH_PARAMS);

  return {
    parameters: { type: "object", properties, required },
    actions,
  };
}

/**
 * Canvas node feeding an agent's `integration` handle -> platform-tool descriptor.
 * Accepts both the legacy `agent_integration_*` nodes and plain app nodes, whose
 * values may sit on `data` or on `data.config` depending on the panel.
 */
export function toPlatformTool(node) {
  if (!node?.type) return null;
  const data = node.data || {};
  const cfg = data.config && typeof data.config === "object" ? { ...data, ...data.config } : data;
  if (!cfg.credentialId) return null;
  const type = String(node.type).replace(/^agent_integration_/, "");
  if (!type) return null;
  return {
    type,
    credentialId: cfg.credentialId,
    alias: cfg.alias || "",
    enabledActions: Array.isArray(cfg.enabledActions) ? cfg.enabledActions.filter(Boolean) : [],
    resources: cfg.resources && typeof cfg.resources === "object" ? cfg.resources : null,
  };
}

/**
 * Run one operation through the app's own action node — same credential
 * resolution, same handlers, no duplicate backend.
 */
export async function runIntegrationOperation(type, args = {}, credentialId, workspaceId) {
  const node = await loadNode(type);
  if (!node?.run) {
    return { success: false, error: `Integration "${type}" has no runnable backend.`, skipped: true };
  }
  const { params, ...rest } = args;
  const config = { ...rest, ...(params && typeof params === "object" ? params : {}), credentialId };
  return node.run(config, {}, { workspaceId });
}
