/**
 * Datadog — Dashboards.
 */
import { need } from "../GenericFunctions.js";

async function opListDashboards(config, { v1 }) {
  const { data } = await v1.get("/dashboard");
  return { success: true, dashboards: data.dashboards, count: data.dashboards?.length || 0 };
}

async function opGetDashboard(config, { v1 }) {
  const e = need(config, "dashboardId", "getDashboard"); if (e) return e;
  const { data } = await v1.get(`/dashboard/${encodeURIComponent(config.dashboardId)}`);
  return { success: true, ...data };
}

async function opDeleteDashboard(config, { v1 }) {
  const e = need(config, "dashboardId", "deleteDashboard"); if (e) return e;
  await v1.delete(`/dashboard/${encodeURIComponent(config.dashboardId)}`);
  return { success: true, deleted: config.dashboardId };
}

export const dashboardOperations = {
  listDashboards: opListDashboards,
  getDashboard: opGetDashboard,
  deleteDashboard: opDeleteDashboard,
};
