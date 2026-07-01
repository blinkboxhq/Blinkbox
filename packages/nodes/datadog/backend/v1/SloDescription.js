/**
 * Datadog — SLOs.
 */
import { need, num } from "../GenericFunctions.js";

async function opListSlos(config, { v1 }) {
  const { data } = await v1.get("/slo", { params: { query: config.query, limit: num(config.limit, 100) } });
  return { success: true, slos: data.data, count: data.data?.length || 0 };
}

async function opGetSlo(config, { v1 }) {
  const e = need(config, "sloId", "getSlo"); if (e) return e;
  const { data } = await v1.get(`/slo/${encodeURIComponent(config.sloId)}`);
  return { success: true, ...data.data };
}

async function opDeleteSlo(config, { v1 }) {
  const e = need(config, "sloId", "deleteSlo"); if (e) return e;
  await v1.delete(`/slo/${encodeURIComponent(config.sloId)}`);
  return { success: true, deleted: config.sloId };
}

export const sloOperations = {
  listSlos: opListSlos,
  getSlo: opGetSlo,
  deleteSlo: opDeleteSlo,
};
