/**
 * Datadog — Logs. sendLog posts to the logs intake host directly (axios).
 */
import axios from "axios";
import { need, num } from "../GenericFunctions.js";

async function opSendLog(config, { site, headers }) {
  const e = need(config, "message", "sendLog"); if (e) return e;
  const payload = [{
    ddsource: config.source || "blinkbox",
    ddtags: config.ddtags || config.tags || "",
    hostname: config.hostname || config.host || "blinkbox",
    message: config.message,
    service: config.service || "blinkbox",
  }];
  await axios.post(`https://http-intake.logs.${site}/api/v2/logs`, payload, {
    headers: { "DD-API-KEY": headers["DD-API-KEY"], "Content-Type": "application/json" },
    timeout: 120000,
  });
  return { success: true, status: "accepted" };
}

async function opSearchLogs(config, { v2 }) {
  const { data } = await v2.post("/logs/events/search", {
    filter: { query: config.query || "*", from: config.from || "now-1h", to: config.to || "now" },
    page: { limit: num(config.limit, 20) },
    sort: config.sort || "-timestamp",
  });
  return { success: true, logs: data.data, count: data.data?.length || 0 };
}

export const logOperations = {
  sendLog: opSendLog,
  searchLogs: opSearchLogs,
  listLogs: opSearchLogs,
};
