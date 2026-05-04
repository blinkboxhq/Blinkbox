import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "queryMetrics";
    const site = config.site || "datadoghq.com";
    const BASE = `https://api.${site}/api/v1`;
    const BASE_V2 = `https://api.${site}/api/v2`;

    let apiKey, appKey;
    if (config.credentialId) {
      const cred = await resolveCredential(config.credentialId, context.workspaceId, "Datadog");
      const raw = decrypt(cred.encryptedData, cred.iv, cred.authTag);
      try { const j = JSON.parse(raw); apiKey = j.apiKey; appKey = j.appKey; } catch { apiKey = raw; }
    }
    apiKey = apiKey || config.apiKey;
    appKey = appKey || config.appKey;
    if (!apiKey) return { success: false, error: "Datadog: API key required.", skipped: true };

    const headers = { "DD-API-KEY": apiKey, "DD-APPLICATION-KEY": appKey || "", "Content-Type": "application/json" };

    switch (operation) {
      case "queryMetrics": {
        const now = Math.floor(Date.now() / 1000);
        const from = config.from || now - 3600;
        const { data } = await axios.get(`${BASE}/query`, { headers, params: { query: config.query || "*", from, to: config.to || now }, timeout: 15000 });
        return { series: data.series, query: config.query };
      }
      case "submitMetric": {
        const now = Math.floor(Date.now() / 1000);
        const { data } = await axios.post(`${BASE}/series`, {
          series: [{ metric: config.metric, points: [[now, config.value || 1]], type: config.type || "gauge", tags: config.tags ? config.tags.split(",") : [] }]
        }, { headers, timeout: 15000 });
        return { status: data.status, metric: config.metric };
      }
      case "listEvents": {
        const now = Math.floor(Date.now() / 1000);
        const { data } = await axios.get(`${BASE}/events`, { headers, params: { start: config.from || now - 3600, end: config.to || now, priority: config.priority, tags: config.tags }, timeout: 15000 });
        return { events: data.events, count: data.events?.length || 0 };
      }
      case "createEvent": {
        const { data } = await axios.post(`${BASE}/events`, { title: config.title || "BlinkBox Event", text: config.text || "", tags: config.tags ? config.tags.split(",") : [], alert_type: config.alertType || "info" }, { headers, timeout: 15000 });
        return { id: data.event?.id, status: "created" };
      }
      case "listMonitors": {
        const { data } = await axios.get(`${BASE}/monitor`, { headers, params: { tags: config.tags, name: config.name }, timeout: 15000 });
        return { monitors: data, count: data.length };
      }
      case "muteMonitor": {
        const id = config.monitorId || input.monitorId;
        if (!id) return { success: false, error: "Datadog muteMonitor: 'monitorId' required.", skipped: true };
        await axios.post(`${BASE}/monitor/${id}/mute`, {}, { headers, timeout: 10000 });
        return { success: true, monitorId: id, muted: true };
      }
      case "listLogs": {
        const { data } = await axios.post(`${BASE_V2}/logs/events/search`, { filter: { query: config.query || "*", from: config.from || "now-1h", to: config.to || "now" }, page: { limit: config.limit || 20 } }, { headers, timeout: 15000 });
        return { logs: data.data, count: data.data?.length || 0 };
      }
      default:
        return { success: false, error: `Datadog: Unknown operation "${operation}".`, skipped: true };
    }
  },
};
