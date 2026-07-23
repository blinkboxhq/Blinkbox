/**
 * Sentry — monitoring (DSN-based event capture). Handlers receive
 * `(config, ctx, context)` where ctx = { org, headers }. captureEvent uses the
 * project DSN directly and does not require the org header/token.
 */
import axios from "axios";
import { skip } from "../GenericFunctions.js";

async function opCaptureEvent(config, ctx) {
  if (!config.dsn) return skip("captureEvent", "'dsn' required");
  const m = String(config.dsn).match(/https:\/\/([^@]+)@([^/]+)\/(\d+)/);
  if (!m) return skip("captureEvent", "invalid DSN format");
  const [, key, host, projectId] = m;
  if (!/^[\w.-]+$/.test(host)) return skip("captureEvent", "invalid DSN host");
  const tags = Array.isArray(config.tags)
    ? Object.fromEntries(config.tags.filter((r) => r && r.key).map((r) => [r.key, r.value]))
    : config.tags || {};
  const data = await axios
    .post(
      `https://${host}/api/${projectId}/store/`,
      { message: config.message || "BlinkBox event", level: config.level || "error", tags },
      { headers: { "X-Sentry-Auth": `Sentry sentry_version=7,sentry_key=${key}` }, timeout: 120000 }
    )
    .then((r) => r.data);
  return { id: data.id, success: true };
}

export const monitoringOperations = {
  captureEvent: opCaptureEvent,
};
