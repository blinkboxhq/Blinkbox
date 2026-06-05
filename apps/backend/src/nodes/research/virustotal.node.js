import axios from "axios";

const TIMEOUT = 15000;

export default {
  async run(config, input) {
    const apiKey = config.apiKey || input?.apiKey;
    const operation = config.operation || "scanUrl";
    if (!apiKey) throw new Error("virustotal: API key is required.");

    const headers = { "x-apikey": apiKey };
    try {
      if (operation === "scanUrl") {
        const url = config.url || input?.url;
        if (!url) throw new Error("virustotal: 'url' is required.");
        const encoded = Buffer.from(url).toString("base64url");
        const res = await axios.get(`https://www.virustotal.com/api/v3/urls/${encoded}`, { headers, timeout: TIMEOUT });
        const stats = res.data.data?.attributes?.last_analysis_stats || {};
        return { url, malicious: stats.malicious, suspicious: stats.suspicious, harmless: stats.harmless, undetected: stats.undetected, stats };
      }
      if (operation === "getUrlReport") {
        const url = config.url || input?.url;
        const encoded = Buffer.from(url).toString("base64url");
        const res = await axios.get(`https://www.virustotal.com/api/v3/urls/${encoded}`, { headers, timeout: TIMEOUT });
        return res.data.data?.attributes || {};
      }
      if (operation === "scanFile") {
        const hash = config.hash || input?.hash;
        if (!hash) throw new Error("virustotal: 'hash' is required.");
        const res = await axios.get(`https://www.virustotal.com/api/v3/files/${hash}`, { headers, timeout: TIMEOUT });
        const stats = res.data.data?.attributes?.last_analysis_stats || {};
        return { hash, malicious: stats.malicious, suspicious: stats.suspicious, harmless: stats.harmless, stats };
      }
      if (operation === "getIpReport") {
        const ip = config.ip || input?.ip;
        if (!ip) throw new Error("virustotal: 'ip' is required.");
        const res = await axios.get(`https://www.virustotal.com/api/v3/ip_addresses/${ip}`, { headers, timeout: TIMEOUT });
        const stats = res.data.data?.attributes?.last_analysis_stats || {};
        return { ip, malicious: stats.malicious, suspicious: stats.suspicious, harmless: stats.harmless, stats };
      }
      throw new Error(`virustotal: Unknown operation "${operation}".`);
    } catch (err) {
      if (err.response?.status === 404) return { found: false, error: "Resource not found in VirusTotal" };
      throw new Error(`[virustotal] ${err.message}`);
    }
  },
};
