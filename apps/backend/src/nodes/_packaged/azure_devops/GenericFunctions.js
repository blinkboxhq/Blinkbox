/**
 * Azure DevOps — shared helpers for all v1 action files.
 * The requester `ctx` is built by makeReq() from the resolved PAT + config
 * (it embeds org/project URLs and Basic-auth headers); every handler is
 * called `(config, ctx)`.
 *
 * Auth: Personal Access Token (PAT). Sent as HTTP Basic with an empty
 * username (":PAT" base64-encoded), per Azure DevOps convention.
 */
import axios from "axios";

export const API = "7.1";

export const enc = encodeURIComponent;
export const csv = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);
export const LIMIT = (config, def = 50) => Math.min(Number(config.wiqlLimit || config.limit || def), 200);

export function ctxFor(config, pat) {
  const org = config.organization;
  const ORG = `https://dev.azure.com/${enc(org)}`;
  const project = config.project ? enc(config.project) : null;
  const PROJ = project ? `${ORG}/${project}` : ORG;
  const headers = {
    Authorization: "Basic " + Buffer.from(":" + pat).toString("base64"),
    "Content-Type": "application/json",
  };
  return { org, ORG, PROJ, headers };
}

export const get = (url, ctx) => axios.get(url, { headers: ctx.headers, timeout: 20000 }).then((r) => r.data);
export const post = (url, body, ctx, ct) =>
  axios.post(url, body, { headers: { ...ctx.headers, ...(ct ? { "Content-Type": ct } : {}) }, timeout: 20000 }).then((r) => r.data);
export const patch = (url, body, ctx, ct) =>
  axios.patch(url, body, { headers: { ...ctx.headers, ...(ct ? { "Content-Type": ct } : {}) }, timeout: 20000 }).then((r) => r.data);
export const del = (url, ctx) => axios.delete(url, { headers: ctx.headers, timeout: 20000 }).then((r) => r.data);

export function jsonPatch(ops) {
  return ops.filter((o) => o.value !== undefined && o.value !== "");
}

export function skip(op, msg) {
  return { success: false, error: `Azure DevOps ${op}: ${msg}.`, skipped: true };
}

export function makeReq(token, config) {
  return ctxFor(config, token);
}

export function handleError(err) {
  if (err.message?.startsWith("Azure DevOps")) throw err;
  const status = err.response?.status;
  const apiMsg = err.response?.data?.message;
  if (status === 401) throw new Error("Azure DevOps: Invalid or expired Personal Access Token.");
  if (status === 403) throw new Error("Azure DevOps: PAT lacks required scope for this operation.");
  if (status === 404) throw new Error(`Azure DevOps: Not found — ${apiMsg || "check organization/project/id."}`);
  if (status === 400) throw new Error(`Azure DevOps: ${apiMsg || "Bad request."}`);
  if (status === 429) throw new Error("Azure DevOps: Rate limit exceeded. Slow down requests.");
  throw new Error(`Azure DevOps: ${apiMsg || err.message}`);
}

export { axios };
