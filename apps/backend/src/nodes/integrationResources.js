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
  github: {
    repos: {
      label: "Repositories",
      hint: "Repos the agent may read or write.",
      param: "repo",
      operation: "listMyRepos",
      args: { limit: 100, sort: "updated" },
      map: (r) =>
        (r?.repos || []).map((x) => ({
          id: x.fullName,
          label: x.fullName,
          meta: x.private ? "private" : "",
        })),
      // GitHub addresses a repo with two params, so one pick fills both.
      expand: (id) => {
        const [owner, repo] = String(id).split("/");
        return repo ? { owner, repo } : {};
      },
      notes: {
        owner: "Filled from the selected repository — pass the full owner/name in `repo` instead",
      },
      // Ops that take no repo (getUser, listUserRepos) still need a login.
      implied: (list) => {
        const owners = [...new Set(list.map((o) => String(o.id).split("/")[0]).filter(Boolean))];
        return owners.length === 1 ? { owner: owners[0], username: owners[0] } : {};
      },
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
  const res = await runIntegrationOperation(
    type,
    { operation: spec.operation, ...(spec.args || {}) },
    credentialId,
    workspaceId,
  );
  if (res?.success === false) return { options: [], error: res.error || "Lookup failed." };
  const options = spec.map(res).filter((o) => o.id);
  return { options };
}

const norm = (v) => String(v).replace(/^[#@]/, "").trim().toLowerCase();

const pinnedFor = (type, resources) => {
  const spec = RESOURCE_SPECS[type];
  if (!spec || !resources || typeof resources !== "object") return [];
  return Object.entries(spec)
    .map(([kind, s]) => ({ param: s.param, spec: s, list: Array.isArray(resources[kind]) ? resources[kind] : [] }))
    .filter((e) => e.list.length);
};

/** Bake pinned IDs into the tool schema so the model only ever sees real ones. */
export function describeResources(type, resources, parameters) {
  const pinned = pinnedFor(type, resources);
  if (!pinned.length || !parameters?.properties) return parameters;
  const properties = { ...parameters.properties };
  for (const { param, list, spec } of pinned) {
    for (const [key, note] of Object.entries(spec.notes || {})) {
      if (properties[key]) properties[key] = { ...properties[key], description: note };
    }
    const base = properties[param] || { type: "string" };
    properties[param] = {
      ...base,
      enum: list.map((o) => o.id),
      description: `${base.description ? `${base.description}. ` : ""}Allowed: ${list
        .map((o) => (o.label && o.label !== o.id ? `${o.id} (${o.label})` : o.id))
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
  for (const { param, spec, list } of pinned) {
    const given = out[param];
    let resolved = null;

    if (given === undefined || given === null || given === "") {
      if (list.length === 1) resolved = list[0].id;
    } else if (list.some((o) => o.id === given)) {
      resolved = given;
    } else {
      const needle = norm(given);
      const hit =
        list.find((o) => norm(o.label) === needle || norm(o.id) === needle) ||
        // "Blinkbox" for an id of "blinkboxhq/Blinkbox"
        list.find((o) => norm(o.id).split("/").pop() === needle);
      if (hit) resolved = hit.id;
    }

    if (spec.implied) {
      for (const [key, val] of Object.entries(spec.implied(list))) {
        if (out[key] === undefined || out[key] === null || out[key] === "") out[key] = val;
      }
    }
    if (!resolved) continue;
    out[param] = resolved;
    if (spec.expand) Object.assign(out, spec.expand(resolved));
  }
  return out;
}
