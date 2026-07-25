// Derives the trigger config-panel schemas from the frontend.
//
// triggerEvents.js is the only place that knows which fields a trigger's panel
// shows, which event ids are legal, and which `$trigger.*` variables the event
// emits. The MCP connector and Brian both need that server-side, so it is
// derived into a checked-in module (src/nodes/triggerFields.js) instead of
// reaching across the app boundary at runtime. triggerFields.test.js re-runs
// this and fails on drift.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.join(HERE, "../../frontend/src/pages/Workspace");

// Panel widget -> the type an agent needs to know to fill the field.
const TYPE = {
  text: "string",
  textarea: "string",
  password: "secret",
  credential: "credential",
  select: "enum",
  pills: "enum",
  "switch-row": "boolean",
  number: "number",
};

const clean = (s) =>
  String(s || "")
    .replace(/^\/\/\s*/, "")
    .trim() || null;

function describeField(f) {
  const out = { k: f.key, t: TYPE[f.type] || "string", label: f.label || f.key };
  const hint = clean(f.hint);
  if (hint) out.d = hint;
  if (f.credType) out.credType = f.credType;
  if (f.placeholder) out.ex = f.placeholder;
  if (f.default !== undefined) out.def = f.default;
  if (Array.isArray(f.options) && f.options.length)
    out.opts = f.options.map((o) => (typeof o === "string" ? o : o.value));
  return out;
}

export async function deriveTriggerFields() {
  const events = await import(path.join(WORKSPACE, "triggerEvents.js"));
  const TRIGGER_EVENTS = events.TRIGGER_EVENTS;
  const eventDefaults = events.eventDefaults;

  // variant id (the key TRIGGER_EVENTS uses) -> backendType (the node key).
  const variantSrc = fs.readFileSync(path.join(WORKSPACE, "triggerVariants.js"), "utf8");
  const backendTypeOf = new Map();
  const marks = [...variantSrc.matchAll(/^ {2}([a-zA-Z0-9_]+):\s*\{/gm)];
  marks.forEach((m, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].index : variantSrc.length;
    const chunk = variantSrc.slice(m.index, end);
    const bt = (chunk.match(/backendType:\s*["']([^"']+)["']/) || [])[1];
    if (bt) backendTypeOf.set(m[1], bt);
  });

  const triggers = {};
  const unmapped = [];

  for (const [variantId, spec] of Object.entries(TRIGGER_EVENTS)) {
    const key = backendTypeOf.get(variantId);
    if (!key) {
      unmapped.push(variantId);
      continue;
    }
    const list = spec.events || [];

    // A field shown by every event belongs to the trigger; anything else is
    // specific to the event the user picked.
    const counts = new Map();
    const byKey = new Map();
    const out = new Map();
    for (const ev of list) {
      const seen = new Set();
      for (const f of ev.fields || []) {
        if (f.type === "vars") {
          for (const [name, desc] of f.rows || [])
            if (!out.has(name)) out.set(name, desc);
          continue;
        }
        if (!f.key || seen.has(f.key)) continue;
        seen.add(f.key);
        counts.set(f.key, (counts.get(f.key) || 0) + 1);
        if (!byKey.has(f.key)) byKey.set(f.key, describeField(f));
      }
    }
    const isCommon = (k) => counts.get(k) === list.length;

    triggers[key] = {
      variant: variantId,
      label: spec.title || variantId,
      hint: spec.subtitle || null,
      fields: [...byKey.keys()].filter(isCommon).map((k) => byKey.get(k)),
      events: list.map((ev) => {
        const extra = (ev.fields || [])
          .filter((f) => f.type !== "vars" && f.key && !isCommon(f.key))
          .map(describeField);
        const e = { id: ev.id, label: ev.label, cfg: eventDefaults(variantId, ev.id) };
        if (ev.description) e.d = ev.description;
        if (extra.length) e.fields = extra;
        return e;
      }),
      out: [...out.entries()].map(([name, desc]) => [name.replace(/^\$trigger\./, ""), desc]),
    };
  }

  return { triggers, unmapped };
}
