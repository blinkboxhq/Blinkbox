import axios from "axios";
import { assertSafeUrlResolved } from "../../utils/ssrf.js";

export default {
  async run(config, input) {
    const url = config.url || input?.url;
    if (!url) return { success: false, error: "http_monitor: 'url' is required.", skipped: true };
    await assertSafeUrlResolved(url);

    const start = Date.now();
    try {
      const res = await axios.get(url, { timeout: parseInt(config.timeout || 10000), maxRedirects: 5, validateStatus: () => true });
      const latency = Date.now() - start;
      const expectedStatus = parseInt(config.expectedStatus || 200);
      const isUp = res.status === expectedStatus;
      return {
        url, isUp, status: res.status, statusText: res.statusText,
        latencyMs: latency, expectedStatus,
        contentType: res.headers["content-type"] || null,
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      return { url, isUp: false, error: err.message, latencyMs: Date.now() - start, checkedAt: new Date().toISOString() };
    }
  },
};
