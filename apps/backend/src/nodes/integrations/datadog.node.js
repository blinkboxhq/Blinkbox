import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

function handleError(err) {
  if (err.message?.startsWith("Datadog")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.errors?.[0] ?? err.response?.data?.error ?? err.message;
  if (status === 400) throw new Error(`Datadog: Bad request — ${msg}`);
  if (status === 401) throw new Error(`Datadog: Authentication failed — check your API key and Application key.`);
  if (status === 403) throw new Error(`Datadog: Forbidden — ${msg}. App key may lack permissions.`);
  if (status === 404) throw new Error(`Datadog: Not found — ${msg}`);
  if (status === 429) throw new Error(`Datadog: Rate limit exceeded. Retry after a short delay.`);
  throw new Error(`Datadog: ${status ?? "Network"} error — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "submitMetric";
    const site = config.site || "datadoghq.com";
    const BASE = `https://api.${site}/api/v1`;
    const BASE_V2 = `https://api.${site}/api/v2`;

    if (!config.credentialId) {
      return { success: false, error: "Datadog: No credential selected — pick a Datadog credential.", skipped: true };
    }

    let apiKey, appKey;
    try {
      const raw = await getOAuthToken(config.credentialId, context.workspaceId, "Datadog");
      try {
        const j = JSON.parse(raw);
        apiKey = j.apiKey;
        appKey = j.appKey;
      } catch {
        apiKey = raw;
      }
    } catch (e) {
      return { success: false, error: `Datadog: Could not resolve credential — ${e.message}`, skipped: true };
    }

    if (!apiKey) return { success: false, error: "Datadog: API key required.", skipped: true };

    const headers = {
      "DD-API-KEY": apiKey,
      "DD-APPLICATION-KEY": appKey || "",
      "Content-Type": "application/json",
    };

    try {
      switch (operation) {
        case "getMetrics":
        case "queryMetrics": {
          const now = Math.floor(Date.now() / 1000);
          if (!config.query) return { success: false, error: "Datadog queryMetrics: 'query' is required.", skipped: true };
          const { data } = await axios.get(`${BASE}/query`, {
            headers,
            params: { query: config.query, from: Number(config.from) || now - 3600, to: Number(config.to) || now },
            timeout: 15000,
          });
          return { success: true, series: data.series, query: config.query };
        }

        case "submitMetric": {
          const metric = config.metricName || config.metric;
          if (!metric) return { success: false, error: "Datadog submitMetric: 'metricName' is required.", skipped: true };
          const now = Math.floor(Date.now() / 1000);
          const value = parseFloat(config.value) || 0;
          const type = config.metricType || config.type || "gauge";
          const tags = config.tags ? String(config.tags).split(",").map((t) => t.trim()).filter(Boolean) : [];
          const { data } = await axios.post(
            `${BASE}/series`,
            { series: [{ metric, points: [[now, value]], type, tags }] },
            { headers, timeout: 15000 }
          );
          return { success: true, status: data.status, metric };
        }

        case "sendEvent":
        case "createEvent": {
          if (!config.title) return { success: false, error: "Datadog sendEvent: 'title' is required.", skipped: true };
          const tags = config.tags ? String(config.tags).split(",").map((t) => t.trim()).filter(Boolean) : [];
          const { data } = await axios.post(
            `${BASE}/events`,
            { title: config.title, text: config.text || "", tags, alert_type: config.alertType || "info" },
            { headers, timeout: 15000 }
          );
          return { success: true, id: data.event?.id, status: "created" };
        }

        case "listEvents": {
          const now = Math.floor(Date.now() / 1000);
          const { data } = await axios.get(`${BASE}/events`, {
            headers,
            params: {
              start: Number(config.from) || now - 3600,
              end: Number(config.to) || now,
              priority: config.priority,
              tags: config.tags,
            },
            timeout: 15000,
          });
          return { success: true, events: data.events, count: data.events?.length || 0 };
        }

        case "createMonitor": {
          if (!config.name) return { success: false, error: "Datadog createMonitor: 'name' is required.", skipped: true };
          if (!config.query) return { success: false, error: "Datadog createMonitor: 'query' is required.", skipped: true };
          const { data } = await axios.post(
            `${BASE}/monitor`,
            {
              name: config.name,
              type: config.type || "metric alert",
              query: config.query,
              message: config.message || "",
            },
            { headers, timeout: 15000 }
          );
          return { success: true, id: data.id, name: data.name, type: data.type, status: data.overall_state };
        }

        case "listMonitors": {
          const { data } = await axios.get(`${BASE}/monitor`, {
            headers,
            params: { tags: config.tags, name: config.name },
            timeout: 15000,
          });
          return { success: true, monitors: data, count: data.length };
        }

        case "getMonitor": {
          const id = config.monitorId || input?.monitorId;
          if (!id) return { success: false, error: "Datadog getMonitor: 'monitorId' is required.", skipped: true };
          const { data } = await axios.get(`${BASE}/monitor/${encodeURIComponent(id)}`, { headers, timeout: 15000 });
          return { success: true, id: data.id, name: data.name, type: data.type, status: data.overall_state, query: data.query };
        }

        case "muteMonitor": {
          const id = config.monitorId || input?.monitorId;
          if (!id) return { success: false, error: "Datadog muteMonitor: 'monitorId' is required.", skipped: true };
          const body = {};
          if (config.end) body.end = config.end;
          await axios.post(`${BASE}/monitor/${encodeURIComponent(id)}/mute`, body, { headers, timeout: 10000 });
          return { success: true, monitorId: id, muted: true };
        }

        case "sendLog": {
          if (!config.message) return { success: false, error: "Datadog sendLog: 'message' is required.", skipped: true };
          const payload = [{
            ddsource: config.source || "blinkbox",
            ddtags: config.ddtags || config.tags || "",
            hostname: config.hostname || "blinkbox",
            message: config.message,
            service: config.service || "blinkbox",
          }];
          await axios.post(
            `https://http-intake.logs.${site}/api/v2/logs`,
            payload,
            { headers: { "DD-API-KEY": apiKey, "Content-Type": "application/json" }, timeout: 10000 }
          );
          return { success: true, status: "accepted" };
        }

        case "listLogs": {
          const { data } = await axios.post(
            `${BASE_V2}/logs/events/search`,
            {
              filter: { query: config.query || "*", from: config.from || "now-1h", to: config.to || "now" },
              page: { limit: parseInt(config.limit) || 20 },
            },
            { headers, timeout: 15000 }
          );
          return { success: true, logs: data.data, count: data.data?.length || 0 };
        }

        default:
          return { success: false, error: `Datadog: Unknown operation "${operation}".`, skipped: true };
      }
    } catch (err) {
      handleError(err);
    }
  },
};
