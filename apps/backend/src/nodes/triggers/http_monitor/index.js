import axios from "axios";

export default {
  async run(config, input) {
    if (input?.statusCode != null && input?.url) return input;
    const url = config.url || config.endpoint;
    if (!url) throw new Error("[http_monitor_trigger] url is required");
    const method = (config.method || "GET").toUpperCase();
    const timeout = Math.min(config.timeout || 10000, 30000);
    const expectedStatus = config.expectedStatus ? parseInt(config.expectedStatus) : null;
    const expectedText = config.expectedText || null;
    const start = Date.now();
    let statusCode, statusText, responseTime, isUp, bodySnippet, error, headers, redirectUrl;
    try {
      const res = await axios({ method, url, timeout, maxRedirects: 5,
        headers: config.headers || {}, data: config.body || undefined,
        validateStatus: () => true,
      });
      statusCode = res.status;
      statusText = res.statusText;
      responseTime = Date.now() - start;
      headers = res.headers;
      redirectUrl = res.request?.res?.responseUrl !== url ? res.request?.res?.responseUrl : null;
      bodySnippet = typeof res.data === "string" ? res.data.slice(0, 500) : JSON.stringify(res.data).slice(0, 500);
      const statusOk = expectedStatus ? statusCode === expectedStatus : statusCode >= 200 && statusCode < 400;
      const contentOk = expectedText ? bodySnippet.includes(expectedText) : true;
      isUp = statusOk && contentOk;
    } catch (err) {
      statusCode = 0;
      statusText = err.code || "ECONNREFUSED";
      responseTime = Date.now() - start;
      error = err.message;
      isUp = false;
    }
    return {
      url, method, isUp, statusCode, statusText, responseTime,
      expectedStatus, statusMatch: expectedStatus ? statusCode === expectedStatus : null,
      expectedText, contentMatch: expectedText ? bodySnippet?.includes(expectedText) : null,
      bodySnippet, redirectUrl, error: error ?? null, ssl: url.startsWith("https"),
      checkedAt: new Date().toISOString(),
    };
  },
};
