/**
 * Sentry — releases & deploys. Handlers receive `(config, ctx, context)` where
 * ctx = { org, headers }.
 */
import { BASE, enc, LIMIT, csv, skip, get, post, put, needOrg } from "../GenericFunctions.js";

async function opListReleases(config, ctx) {
  const e = needOrg(config, ctx, "listReleases"); if (e) return e;
  const data = await get(`${BASE}/organizations/${enc(ctx.org)}/releases/?per_page=${LIMIT(config)}`, ctx);
  return { releases: data.map((r) => ({ version: r.version, dateCreated: r.dateCreated, url: r.url })), count: data.length };
}

async function opGetRelease(config, ctx) {
  const e = needOrg(config, ctx, "getRelease"); if (e) return e;
  if (!config.version) return skip("getRelease", "'version' required");
  return get(`${BASE}/organizations/${enc(ctx.org)}/releases/${enc(config.version)}/`, ctx);
}

async function opCreateRelease(config, ctx) {
  const e = needOrg(config, ctx, "createRelease"); if (e) return e;
  if (!config.version) return skip("createRelease", "'version' required");
  const body = { version: config.version };
  if (config.ref) body.ref = config.ref;
  if (config.url) body.url = config.url;
  if (config.projects) body.projects = csv(config.projects);
  const data = await post(`${BASE}/organizations/${enc(ctx.org)}/releases/`, body, ctx);
  return { version: data.version, url: data.url, dateCreated: data.dateCreated, projects: data.projects };
}

async function opFinalizeRelease(config, ctx) {
  const e = needOrg(config, ctx, "finalizeRelease"); if (e) return e;
  if (!config.version) return skip("finalizeRelease", "'version' required");
  const data = await put(`${BASE}/organizations/${enc(ctx.org)}/releases/${enc(config.version)}/`, { dateReleased: new Date().toISOString() }, ctx);
  return { version: data.version, dateReleased: data.dateReleased, finalized: true };
}

async function opCreateDeploy(config, ctx) {
  const e = needOrg(config, ctx, "createDeploy"); if (e) return e;
  if (!config.version || !config.environment) return skip("createDeploy", "'version' and 'environment' required");
  const body = { environment: config.environment };
  if (config.deployName) body.name = config.deployName;
  if (config.deployUrl) body.url = config.deployUrl;
  const data = await post(`${BASE}/organizations/${enc(ctx.org)}/releases/${enc(config.version)}/deploys/`, body, ctx);
  return { id: data.id, environment: data.environment, dateStarted: data.dateStarted, created: true };
}

async function opListDeploys(config, ctx) {
  const e = needOrg(config, ctx, "listDeploys"); if (e) return e;
  if (!config.version) return skip("listDeploys", "'version' required");
  const data = await get(`${BASE}/organizations/${enc(ctx.org)}/releases/${enc(config.version)}/deploys/`, ctx);
  return { deploys: data, count: data.length };
}

export const releaseOperations = {
  listReleases: opListReleases,
  getRelease: opGetRelease,
  createRelease: opCreateRelease,
  finalizeRelease: opFinalizeRelease,
  createDeploy: opCreateDeploy,
  listDeploys: opListDeploys,
};
