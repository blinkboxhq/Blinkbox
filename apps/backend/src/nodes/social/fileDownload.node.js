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
    if (!url) return { success: false, error: "file_download: 'url' is required.", skipped: true };

    assertSafeUrl(url);
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: parseInt(config.timeout || 60000),
      maxContentLength: parseInt(config.maxSizeMb || 50) * 1024 * 1024,
      maxRedirects: 0,
    });
    if (res.status >= 301 && res.status <= 308 && res.headers.location) {
      const next = new URL(res.headers.location, url).toString();
      assertSafeUrl(next);
      const res2 = await axios.get(next, { responseType: "arraybuffer", timeout: parseInt(config.timeout || 60000), maxContentLength: parseInt(config.maxSizeMb || 50) * 1024 * 1024, maxRedirects: 4 });
      Object.assign(res, { data: res2.data, headers: res2.headers });
    }

    const contentType = res.headers["content-type"] || "application/octet-stream";
    const base64 = Buffer.from(res.data).toString("base64");
    const filename = config.filename || url.split("/").pop()?.split("?")[0] || "file";

    return {
      filename, contentType, base64,
      size: res.data.byteLength,
      dataUri: `data:${contentType};base64,${base64}`,
      url,
    };
  },
};
