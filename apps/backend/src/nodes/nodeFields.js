// One answer to "what goes in this node's config?", merged from every source
// that actually knows — so the MCP connector and Brian never guess a field name.
//
// Priority:
//   1. TRIGGER_FIELDS   the trigger's real config panel, derived from the frontend
//   2. NODE_KB          hand-authored schema (brian.nodes.js)
//   3. integration      {operation, credentialId} + the extras its handler reads
//
// A derived panel outranks a hand-authored entry because it cannot drift: where
// the two disagree the panel is what the frontend actually writes (gmail_trigger's
// pollInterval is a cron string, not the number the KB claims).
//
// A wrong field name produces a config the executor silently ignores, so nothing
// here is invented: every entry traces back to a panel, a router, or a handler.
import { NODE_KB } from "../modules/brian/brian.nodes.js";
import { TRIGGER_FIELDS } from "./triggerFields.js";
import { defaultOperation } from "./integrationManifest.js";

// Config keys an integration node's own handler reads before delegating the
// rest to runIntegrationOperation. Extracted from the handler files — extend
// this only after checking the handler actually reads the key.
const HANDLER_EXTRAS = {
  jira: [{ k: "domain", t: "string", r: true, ex: "acme.atlassian.net", d: "Your Jira site domain" }],
  s3: [
    { k: "bucket", t: "string", r: true, ex: "my-bucket", d: "Target S3 bucket" },
    { k: "accessKeyId", t: "string", r: false, ex: "AKIA…", d: "Overrides the credential's key" },
    { k: "endpoint", t: "string", r: false, ex: "https://s3.eu-west-1.amazonaws.com", d: "Custom/S3-compatible endpoint" },
  ],
  sftp: [{ k: "remotePath", t: "string", r: true, ex: "/uploads/report.csv", d: "Path on the remote server" }],
  redis_node: [],
};

function normalizeKbFields(fields = []) {
  return fields.map((f) => ({
    k: f.k,
    t: f.t || "string",
    r: f.r === true,
    ex: f.ex,
    d: f.d,
  }));
}

function normalizeTriggerField(f) {
  return {
    k: f.k,
    t: f.t,
    // The panel pre-fills anything with a default, so only the blanks are on
    // the caller to supply.
    r: f.def === undefined,
    ex: f.ex ?? f.def,
    d: f.d || f.label,
    opts: f.opts,
    credType: f.credType,
  };
}

// Exact key only: a trigger must never inherit its action twin's schema —
// google_sheets_trigger watches a sheet, google_sheets writes to one.
function kbEntry(key) {
  return NODE_KB[key] || null;
}

/**
 * Describe a picker node's config panel.
 * @param {object} node a PICKER_NODES entry
 * @param {string} [eventId] for triggers, the event whose extra fields to fold in
 */
export async function describeNodeFields(node, eventId) {
  const key = node.key;
  const trig = TRIGGER_FIELDS[key];
  if (trig) {
    const event = eventId ? trig.events.find((e) => e.id === eventId) : null;
    const fields = [
      ...trig.fields.map(normalizeTriggerField),
      ...(event?.fields || []).map(normalizeTriggerField),
    ];
    return {
      source: "trigger",
      label: trig.label,
      hint: trig.hint,
      fields,
      out: trig.out.map(([name]) => name),
      outDocs: trig.out,
      events: trig.events.map((e) => ({ id: e.id, label: e.label, d: e.d })),
      event: event ? { id: event.id, label: event.label, cfg: event.cfg } : null,
      eventCount: trig.events.length,
    };
  }

  const kb = kbEntry(key);
  if (kb) {
    return {
      source: "kb",
      label: kb.label || node.label,
      fields: normalizeKbFields(kb.fields),
      out: kb.out || [],
    };
  }

  if (node.integration && node.category !== "trigger") {
    const def = await defaultOperation(node.integration).catch(() => null);
    return {
      source: "integration",
      label: node.label,
      fields: [
        {
          k: "operation",
          t: "enum",
          r: true,
          ex: def || undefined,
          d: "Which operation to run — see list_node_actions for the full list",
        },
        {
          k: "credentialId",
          t: "credential",
          r: true,
          d: `id of a saved ${node.integration} credential`,
        },
        ...(HANDLER_EXTRAS[key] || []),
      ],
      out: [],
      passthrough: true,
    };
  }

  return { source: "none", label: node.label, fields: [], out: [] };
}

// The credential `type` values a node's own panel asks for. Trigger panels name
// theirs explicitly (credType), which is often not the node key — figma_trigger
// wants a "figma" credential.
export function credentialTypesFor(node) {
  const trig = TRIGGER_FIELDS[node.key];
  if (!trig) return [];
  return [...new Set(trig.fields.filter((f) => f.t === "credential" && f.credType).map((f) => f.credType))];
}

export function hasFieldKnowledge(node) {
  return Boolean(
    TRIGGER_FIELDS[node.key] ||
      kbEntry(node.key) ||
      (node.integration && node.category !== "trigger"),
  );
}
