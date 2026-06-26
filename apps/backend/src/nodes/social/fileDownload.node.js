import axios from "axios";
import { assertSafeUrlResolved } from "../../utils/ssrf.js";

export default {
  async run(config, input) {
    const url = config.url || input?.url;
    if (!url) return { success: false, error: "file_download: 'url' is required.", skipped: true };

    await assertSafeUrlResolved(url);
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: parseInt(config.timeout || 60000),
      maxContentLength: parseInt(config.maxSizeMb || 50) * 1024 * 1024,
      maxRedirects: 0,
    });
    if (res.status >= 301 && res.status <= 308 && res.headers.location) {
      const next = new URL(res.headers.location, url).toString();
      await assertSafeUrlResolved(next);
      const res2 = await axios.get(next, { responseType: "arraybuffer", timeout: parseInt(config.timeout || 60000), maxContentLength: parseInt(config.maxSizeMb || 50) * 1024 * 1024, maxRedirects: 0 });
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
