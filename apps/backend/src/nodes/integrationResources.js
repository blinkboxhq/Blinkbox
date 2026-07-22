/**
 * Integration resources — the live lists an agent needs IDs for.
 *
 * An LLM cannot invent a Slack channel ID. So the user pins the channels (or
 * boards, or bases…) the agent may touch on the node panel, the pinned list is
 * baked into the tool schema as an enum, and anything the model still passes by
 * name is resolved back to its ID at call time.
 */
import { runIntegrationOperation } from "./integrationManifest.js";

export const RESOURCE_SPECS = {
  slack: {
    channels: {
      label: "Channels",
      hint: "Channels the agent may post to or read.",
      param: "channel",
      operation: "listChannels",
      map: (r) =>
        (r?.channels || [])
          .filter((c) => !c.isArchived)
          .map((c) => ({ id: c.id, label: `#${c.name}`, meta: c.isPrivate ? "private" : "" })),
    },
  },
};

/** Resource kinds an app exposes — panel metadata, no credential needed. */
export function listResourceKinds(type) {
  const spec = RESOURCE_SPECS[type];
  if (!spec) return [];
  return Object.entries(spec).map(([kind, s]) => ({
    kind,
    label: s.label,
    hint: s.hint || "",
    param: s.param,
  }));
}

/** Live options for one resource kind, fetched through the app's own node. */
export async function fetchResource(type, kind, credentialId, workspaceId) {
  const spec = RESOURCE_SPECS[type]?.[kind];
  if (!spec) return { options: [], error: `Unknown resource "${kind}" for ${type}.` };
  const res = await runIntegrationOperation(type, { operation: spec.operation }, credentialId, workspaceId);
  if (res?.success === false) return { options: [], error: res.error || "Lookup failed." };
  const options = spec.map(res).filter((o) => o.id);
  return { options };
}

const pinnedFor = (type, resources) => {
  const spec = RESOURCE_SPECS[type];
  if (!spec || !resources || typeof resources !== "object") return [];
  return Object.entries(spec)
    .map(([kind, s]) => ({ param: s.param, list: Array.isArray(resources[kind]) ? resources[kind] : [] }))
    .filter((e) => e.list.length);
};

/** Bake pinned IDs into the tool schema so the model only ever sees real ones. */
export function describeResources(type, resources, parameters) {
  const pinned = pinnedFor(type, resources);
  if (!pinned.length || !parameters?.properties) return parameters;
  const properties = { ...parameters.properties };
  for (const { param, list } of pinned) {
    const base = properties[param] || { type: "string" };
    properties[param] = {
      ...base,
      enum: list.map((o) => o.id),
      description: `${base.description ? `${base.description}. ` : ""}Allowed: ${list
        .map((o) => `${o.id} (${o.label})`)
        .join(", ")}`,
    };
  }
  return { ...parameters, properties };
}

/** Fill in / repair the ID the model passed, using the pinned list. */
export function applyResourceDefaults(type, args = {}, resources) {
  const pinned = pinnedFor(type, resources);
  if (!pinned.length) return args;
  const out = { ...args };
  for (const { param, list } of pinned) {
    const given = out[param];
    if (given === undefined || given === null || given === "") {
      if (list.length === 1) out[param] = list[0].id;
      continue;
    }
    if (list.some((o) => o.id === given)) continue;
    const needle = String(given).replace(/^#/, "").toLowerCase();
    const hit = list.find((o) => o.label.replace(/^#/, "").toLowerCase() === needle);
    if (hit) out[param] = hit.id;
  }
  return out;
}
