/**
 * Datadog — Metrics.
 */
import { skip, need, num, flt, csv, nowSec } from "../GenericFunctions.js";

async function opSubmitMetric(config, { v1 }) {
  const metric = config.metricName || config.metric;
  if (!metric) return skip("submitMetric", "'metricName' is required.");
  const series = [{
    metric,
    points: [[nowSec(), flt(config.value, 0)]],
    type: config.metricType || config.type || "gauge",
    tags: config.tags ? csv(config.tags) : [],
  }];
  if (config.host) series[0].host = config.host;
  const { data } = await v1.post("/series", { series });
  return { success: true, status: data.status, metric };
}

async function opQueryMetrics(config, { v1 }) {
  const e = need(config, "query", "queryMetrics"); if (e) return e;
  const now = nowSec();
  const { data } = await v1.get("/query", {
    params: { query: config.query, from: num(config.from, now - 3600), to: num(config.to, now) },
  });
  return { success: true, query: config.query, series: data.series, from_date: data.from_date, to_date: data.to_date };
}

async function opListActiveMetrics(config, { v1 }) {
  const { data } = await v1.get("/metrics", {
    params: { from: num(config.from, nowSec() - 86400), host: config.host, tag_filter: config.tags },
  });
  return { success: true, metrics: data.metrics, count: data.metrics?.length || 0 };
}

async function opGetMetricMetadata(config, { v1 }) {
  const e = need(config, "metricName", "getMetricMetadata"); if (e) return e;
  const { data } = await v1.get(`/metrics/${encodeURIComponent(config.metricName)}`);
  return { success: true, ...data };
}

async function opUpdateMetricMetadata(config, { v1 }) {
  const e = need(config, "metricName", "updateMetricMetadata"); if (e) return e;
  const body = {};
  if (config.description) body.description = config.description;
  if (config.unit) body.unit = config.unit;
  if (config.metricType || config.type) body.type = config.metricType || config.type;
  if (config.perUnit) body.per_unit = config.perUnit;
  const { data } = await v1.put(`/metrics/${encodeURIComponent(config.metricName)}`, body);
  return { success: true, ...data };
}

async function opSearchMetrics(config, { v1 }) {
  const e = need(config, "query", "searchMetrics"); if (e) return e;
  const { data } = await v1.get("/search", { params: { q: `metrics:${config.query}` } });
  return { success: true, metrics: data.results?.metrics || [], count: data.results?.metrics?.length || 0 };
}

export const metricOperations = {
  submitMetric: opSubmitMetric,
  queryMetrics: opQueryMetrics,
  getMetrics: opQueryMetrics,
  listActiveMetrics: opListActiveMetrics,
  getMetricMetadata: opGetMetricMetadata,
  updateMetricMetadata: opUpdateMetricMetadata,
  searchMetrics: opSearchMetrics,
};
