import axios from "axios";

function assertSafeUrl(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { throw new Error(`Invalid URL: "${rawUrl}"`); }
  const h = u.hostname.toLowerCase();
  const blocked = [
    /^localhost$/, /^127\./, /^0\.0\.0\.0$/, /^::1$/, /^0:0:0:0:0:0:0:1$/,
    /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
    /^169\.254\./, /^fc00:/i, /^fe80:/i, /^fd/i,
    /\.internal$/, /\.local$/,
  ];
  if (blocked.some(r => r.test(h))) throw new Error(`SSRF blocked: "${h}" is a private/internal address.`);
}

export default {
  async run(config, input) {
    const url = config.url || input?.url;
    if (!url) return { success: false, error: "http_monitor: 'url' is required.", skipped: true };
    assertSafeUrl(url);

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
