// Derives the arguments each integration operation accepts, by reading the
// handlers themselves.
//
// Only a handful of the 120 packaged apps hand-declare `params` in their
// OPERATION_SCHEMA, so an agent choosing an operation has no idea what to put
// next to it. The handlers do know: every one of them reads its arguments off
// the config object. This walks each operation's source — following the local
// helpers and field maps it delegates to — and reports the keys it reads, which
// of them it refuses to run without, and the type its usage implies.
//
// Nothing here is invented: a key is only reported if some handler reads it.
// generate-operation-params.mjs writes the result to src/nodes/operationParams.js
// and operationParams.test.js re-runs this to fail on drift.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGED = path.join(HERE, "../src/nodes/_packaged");

// Config keys the platform fills in, not the caller.
const RESERVED = new Set([
  "operation",
  "credentialId",
  "credential",
  "workspaceId",
  "executionId",
  "nodeId",
  "type",
  "enabledActions",
  "resources",
  "alias",
]);

const IDENT = "[A-Za-z_$][\\w$]*";
const rx = (body, flags = "g") => new RegExp(body, flags);

// Same mapping integrationManifest uses: packaged dir -> integration type.
const TYPE_OVERRIDES = { redis: "redis_node" };
const typeOf = (dir) =>
  TYPE_OVERRIDES[dir] || dir.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

function appDirs() {
  return fs
    .readdirSync(PACKAGED, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(PACKAGED, d.name, "router.js")))
    .map((d) => d.name);
}

function sourceFiles(dir) {
  const out = [];
  const walk = (p) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(".js")) out.push(full);
    }
  };
  walk(path.join(PACKAGED, dir));
  return out.map((f) => fs.readFileSync(f, "utf8")).join("\n");
}

// The bracketed group that starts at or after `from`, bracket-matched so a
// helper's source never bleeds into the next definition.
function blockAt(src, from, open = "{", close = "}") {
  const start = src.indexOf(open, from);
  if (start < 0) return "";
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close) {
      depth--;
      if (!depth) return src.slice(start, i + 1);
    }
  }
  return src.slice(start);
}

// A concise arrow has no block body — `const url = (c) => `${BASE}/${c.id}`` —
// so take the expression up to the end of its statement instead.
function statementAt(src, from) {
  let depth = 0;
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) {
      if (!depth) return src.slice(from, i);
      depth--;
    } else if (!depth && (c === ";" || c === "\n")) return src.slice(from, i);
  }
  return src.slice(from);
}

// `function name(…) {…}` / `const name = (…) => {…}` / `const name = {…}`,
// returned from the definition through the end of its body. The parameter list
// has to survive with it: a helper that destructures in place names the config
// keys there and nowhere else.
function definitionOf(src, name) {
  for (const p of [
    rx(`(?:async\\s+)?function\\s+${name}\\s*\\(`, ""),
    rx(`(?:const|let|var)\\s+${name}\\s*=`, ""),
  ]) {
    const m = p.exec(src);
    if (!m) continue;
    let cursor = m.index + m[0].length - 1;
    const paren = src.indexOf("(", cursor);
    const brace = src.indexOf("{", cursor);
    if (paren >= 0 && (brace < 0 || paren < brace)) {
      cursor = paren + blockAt(src, paren, "(", ")").length;
    }
    cursor += src.slice(cursor).match(/^\s*(?:=>\s*)?/)[0].length;
    const body = src[cursor] === "{" ? blockAt(src, cursor) : statementAt(src, cursor);
    return src.slice(m.index, cursor + body.length);
  }
  return "";
}

// Split on the commas that belong to this list, not to anything nested in it.
function splitTop(inner) {
  const parts = [];
  let depth = 0;
  let part = "";
  for (const c of inner) {
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
    if (!depth && c === ",") {
      parts.push(part);
      part = "";
    } else part += c;
  }
  parts.push(part);
  return parts;
}

// Names bound by a destructuring pattern: `{ to, subject: s, body = "" }`.
function patternKeys(inner) {
  return splitTop(inner)
    .map((p) => p.split(":")[0].split("=")[0].trim().replace(/^\.\.\./, ""))
    .filter((k) => new RegExp(`^${IDENT}$`).test(k));
}

// Keys of an object literal — a field map like CONTACT_MAP is a written-down
// list of the config keys the app accepts.
function literalKeys(src) {
  const open = src.indexOf("{");
  if (open < 0) return [];
  const body = blockAt(src, open);
  return splitTop(body.slice(1, -1))
    .map((p) => rx(`^\\s*["'\`]?(${IDENT})["'\`]?\\s*:`, "").exec(p)?.[1])
    .filter(Boolean);
}

// What a definition calls its config — the parameter name (`(config, token)`,
// `c => …`) — or, when it destructures in place, the config keys themselves:
// `buildRawEmail({ to, subject, body })` names them and nowhere else does.
function firstParam(src) {
  const head = src
    .trim()
    .replace(rx(`^(?:const|let|var)\\s+${IDENT}\\s*=\\s*`, ""), "")
    .replace(/^async\s+/, "")
    .replace(rx(`^function\\s*(?:${IDENT})?\\s*`, ""), "")
    .replace(/^\(\s*/, "");
  if (head.startsWith("{")) return { keys: patternKeys(blockAt(head, 0).slice(1, -1)) };
  const m = rx(`^(${IDENT})`, "").exec(head);
  return m ? { ident: m[1] } : {};
}

// A helper that looks its second parameter up on its first — `need(config, key)`
// → `config[key]` — is being handed a config key by name at every call site.
function readsConfigByKey(src) {
  const open = src.indexOf("(");
  if (open < 0) return false;
  const [p1, p2] = splitTop(blockAt(src, open, "(", ")").slice(1, -1)).map((p) => p.trim());
  const named = (p) => p && rx(`^${IDENT}$`, "").test(p);
  if (!named(p1) || !named(p2)) return false;
  return rx(`\\b${p1}\\s*\\[\\s*${p2}\\s*\\]`, "").test(src);
}

// `const user = config.userId || config.user` — a local that falls back across
// several config keys is satisfied by any one of them, so the group is one
// requirement wearing several names, not several requirements. Distinct keys
// only: `config.chatId ?? ""` reads one key and supplies a default.
const _aliasCache = new Map();
function aliasesIn(src) {
  const hit = _aliasCache.get(src);
  if (hit) return hit;
  const out = aliasScan(src);
  _aliasCache.set(src, out);
  return out;
}

function aliasScan(src) {
  const groups = [];
  for (const m of src.matchAll(rx(`(?:const|let|var)\\s+${IDENT}\\s*=\\s*([^;\\n]+)`))) {
    if (!/\|\||\?\?/.test(m[1])) continue;
    const reads = [...new Set([...m[1].matchAll(rx(`${IDENT}\\.(${IDENT})`))].map((r) => r[1]))];
    if (reads.length > 1) groups.push(reads);
  }
  return groups;
}

function destructuredFrom(src, id) {
  const keys = [];
  for (const m of src.matchAll(rx(`\\{([^{}]*)\\}\\s*=\\s*${id}\\b`))) keys.push(...patternKeys(m[1]));
  return keys;
}

// A key is required when the handler refuses to run without it. Both refusals
// count: the guard, whether it throws or returns a skip
// (`if (!config.channel) return { skipped: true, … }`), and the message that
// names the key ("'channel' is required"). Alternatives — "'contactId' or
// 'email' is required" — are not: either one will do, so neither is demanded.
function requiredIn(src) {
  const out = new Set();
  for (const m of src.matchAll(/\b(?:throw|skipped\s*:\s*true)\b/g)) {
    const win = src.slice(Math.max(0, m.index - 200), m.index);
    const guard = Math.max(win.lastIndexOf("if ("), win.lastIndexOf("if("));
    const cond = win.slice(guard >= 0 ? guard : win.lastIndexOf("\n") + 1);
    // `if (!body && !html)` refuses only when both are absent, so neither one
    // is required on its own. `if (!a || !b)` demands both.
    if (cond.includes("&&")) continue;
    for (const g of cond.matchAll(rx(`!\\s*(?:${IDENT}\\.)?(${IDENT})`))) out.add(g[1]);
  }
  for (const m of src.matchAll(/is required|are required|must be (?:set|provided)/gi)) {
    const win = src.slice(Math.max(0, m.index - 60), m.index);
    const quoted = [...win.matchAll(rx(`["'\`](${IDENT})["'\`]`))];
    const last = quoted[quoted.length - 1];
    if (!last) continue;
    // The name has to be the thing being demanded: nothing but punctuation
    // between it and "is required", and no alternation in front of it.
    if (!/^[\s:,)\-–—]*$/.test(win.slice(last.index + last[0].length))) continue;
    if (/(?:\bor\b|\band\b|[/,])\s*$/.test(win.slice(0, last.index))) continue;
    out.add(last[1]);
  }
  return out;
}

// The type the source's own use of a value implies, where `at` is the pattern
// that reads it. With no evidence the type is left off rather than defaulted to
// string — a wrong type is worse than a missing one.
function inferType(src, at) {
  const has = (p) => rx(p, "").test(src);
  // A typeof check is the handler stating the shape outright, so it wins.
  for (const t of ["string", "number", "boolean", "object"]) {
    if (has(`typeof\\s+${at}\\s*(?:===|!==)\\s*["'\`]${t}["'\`]`)) return t;
  }
  if (
    has(`Array\\.isArray\\(\\s*${at}`) ||
    has(`${at}\\s*\\??\\.\\s*(?:map|forEach|filter|join|flatMap)\\(`) ||
    has(`${at}\\s*(?:\\|\\||\\?\\?)\\s*\\[`)
  )
    return "array";
  if (
    has(`(?:Number|parseInt|parseFloat)\\(\\s*${at}`) ||
    has(`${at}\\s*(?:\\|\\||\\?\\?)\\s*-?\\d`) ||
    has(`${at}\\s*[<>]=?\\s*-?\\d`)
  )
    return "number";
  if (
    has(`${at}\\s*(?:===|!==)\\s*(?:true|false)`) ||
    has(`${at}\\s*(?:\\|\\||\\?\\?)\\s*false`) ||
    has(`Boolean\\(\\s*${at}`)
  )
    return "boolean";
  if (
    has(`Object\\.(?:keys|entries|assign)\\(\\s*${at}`) ||
    has(`${at}\\s*(?:\\|\\||\\?\\?)\\s*\\{`)
  )
    return "object";
  if (
    has(`\\$\\{[^}]*${at}`) ||
    has(`JSON\\.parse\\(\\s*${at}`) ||
    has(`(?:String|encodeURIComponent)\\(\\s*${at}`) ||
    has(
      `${at}\\s*\\??\\.\\s*(?:trim|toLowerCase|toUpperCase|split|replace|startsWith|endsWith|padStart|slice|substring|match)\\(`,
    ) ||
    has(`${at}\\s*(?:===|!==)\\s*["'\`]`) ||
    has(`${at}\\s*(?:\\|\\||\\?\\?)\\s*["'\`]`)
  )
    return "string";
  return null;
}

const NOT_A_HELPER = new Set([
  "if",
  "for",
  "while",
  "switch",
  "return",
  "catch",
  "typeof",
  "await",
  "function",
  "Boolean",
  "String",
  "Number",
  "JSON",
  "Object",
  "Array",
]);

// Everything the handler reads off its config, following one level of local
// helpers (buildRawEmail(config)) and the field maps they use (props(c, MAP)).
function collect(handlerSrc, appSrc) {
  const keys = new Map();
  const hints = new Set();
  const aliases = [];
  const scanned = new Set();
  const add = (k, t) => {
    if (!keys.has(k) || (!keys.get(k) && t)) keys.set(k, t || null);
  };

  const scan = (src, depth) => {
    if (!src) return;
    const { ident, keys: bound } = firstParam(src);
    for (const k of bound || []) add(k, inferType(src, `\\b${k}\\b`));
    for (const k of requiredIn(src)) hints.add(k);
    for (const g of aliasesIn(src)) aliases.push(g);
    if (!ident) return;

    for (const m of src.matchAll(rx(`\\b${ident}\\.(${IDENT})`)))
      add(m[1], inferType(src, `${ident}\\.${m[1]}`));
    for (const k of destructuredFrom(src, ident)) add(k, inferType(src, `\\b${k}\\b`));
    if (depth <= 0) return;

    // helper(config) / helper(c, MAP) — the arguments live one level down. The
    // config has to be handed over whole: parseAddress(config.from) passes a
    // value, and reading that helper's parameter would harvest its methods.
    for (const m of src.matchAll(
      rx(`\\b(${IDENT})\\s*\\(\\s*(?:\\.\\.\\.)?${ident}\\s*(?=[,)])([^)]*)\\)`),
    )) {
      const [, helper, restArgs] = m;
      if (NOT_A_HELPER.has(helper)) continue;
      const helperSrc = definitionOf(appSrc, helper);
      if (!scanned.has(helper)) {
        scanned.add(helper);
        scan(helperSrc, depth - 1);
      }
      // A field map passed alongside is a written list of accepted keys.
      for (const mapName of restArgs.matchAll(rx(`\\b([A-Z][A-Z0-9_]+)\\b`))) {
        for (const k of literalKeys(definitionOf(appSrc, mapName[1]))) add(k, null);
      }
      // need(config, "contactId", "deleteContact") — a helper that looks the key
      // up on the config is being told which key to demand.
      if (readsConfigByKey(helperSrc)) {
        const named = rx(`["'\`](${IDENT})["'\`]`, "").exec(restArgs);
        if (named) {
          add(named[1], null);
          if (/is required|are required/i.test(helperSrc)) hints.add(named[1]);
        }
      }
    }
  };

  scan(handlerSrc, 2);
  const required = new Set([...hints].filter((k) => keys.has(k)));
  // An alias group is one requirement under several names, so at most one of its
  // members survives. Only ever a tie-break: a group whose alternatives were
  // never demanded leaves the requirement list alone.
  for (const group of aliases) {
    const demanded = group.filter((k) => required.has(k));
    for (const k of demanded.slice(1)) required.delete(k);
  }
  return { keys, required };
}

export async function deriveOperationParams() {
  const params = {};
  const stats = { apps: 0, ops: 0, typed: 0 };

  for (const dir of appDirs().sort()) {
    let mod;
    try {
      mod = await import(path.join(PACKAGED, dir, "router.js"));
    } catch {
      continue;
    }
    const ops = Object.entries(mod.OPERATIONS || {});
    if (!ops.length) continue;
    const appSrc = sourceFiles(dir);
    stats.apps++;

    const forApp = {};
    for (const [op, fn] of ops) {
      stats.ops++;
      if (typeof fn !== "function") continue;
      const { keys, required } = collect(String(fn), appSrc);
      const out = {};
      for (const [k, t] of [...keys.entries()].sort((a, b) => {
        const ra = required.has(a[0]) ? 0 : 1;
        const rb = required.has(b[0]) ? 0 : 1;
        return ra - rb || a[0].localeCompare(b[0]);
      })) {
        if (RESERVED.has(k) || k.startsWith("_")) continue;
        out[k] = { ...(t ? { t } : {}), ...(required.has(k) ? { r: true } : {}) };
      }
      if (Object.keys(out).length) {
        forApp[op] = out;
        stats.typed++;
      }
    }
    if (Object.keys(forApp).length) params[typeOf(dir)] = forApp;
  }

  return { params, stats };
}
