import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "scanUrl";
    let apiKey;
    if (config.credentialId) {
      const cred = await resolveCredential(config.credentialId, context.workspaceId, "VirusTotal");
      apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);
    }
    apiKey = apiKey || config.apiKey;
    if (!apiKey) return { success: false, error: "VirusTotal: API key required.", skipped: true };

    const headers = { "x-apikey": apiKey };
    const BASE = "https://www.virustotal.com/api/v3";

    switch (operation) {
      case "scanUrl": {
        const url = config.url || input.url || "";
        if (!url) return { success: false, error: "VirusTotal scanUrl: 'url' required.", skipped: true };
        const { data: submit } = await axios.post(`${BASE}/urls`, new URLSearchParams({ url }), { headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 });
        const id = submit.data.id;
        // Poll for result
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const { data: result } = await axios.get(`${BASE}/analyses/${id}`, { headers, timeout: 10000 });
          if (result.data.attributes.status === "completed") {
            const stats = result.data.attributes.stats;
            return { url, id, status: "completed", malicious: stats.malicious, suspicious: stats.suspicious, harmless: stats.harmless, undetected: stats.undetected, stats };
          }
        }
        return { url, id, status: "pending", message: "Analysis still running — check back with the analysis ID." };
      }
      case "getUrlReport": {
        const url = config.url || input.url || "";
        if (!url) return { success: false, error: "VirusTotal getUrlReport: 'url' required.", skipped: true };
        const id = Buffer.from(url).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
        const { data } = await axios.get(`${BASE}/urls/${id}`, { headers, timeout: 10000 });
        const stats = data.data.attributes.last_analysis_stats;
        return { url, malicious: stats?.malicious, suspicious: stats?.suspicious, harmless: stats?.harmless, reputation: data.data.attributes.reputation };
      }
      case "scanFile": {
        const hash = config.hash || input.hash || "";
        if (!hash) return { success: false, error: "VirusTotal scanFile: 'hash' (MD5/SHA1/SHA256) required.", skipped: true };
        const { data } = await axios.get(`${BASE}/files/${hash}`, { headers, timeout: 10000 });
        const stats = data.data.attributes.last_analysis_stats;
        return { hash, name: data.data.attributes.meaningful_name, malicious: stats?.malicious, suspicious: stats?.suspicious, harmless: stats?.harmless, size: data.data.attributes.size };
      }
      case "getIpReport": {
        const ip = config.ip || input.ip || "";
        if (!ip) return { success: false, error: "VirusTotal getIpReport: 'ip' required.", skipped: true };
        const { data } = await axios.get(`${BASE}/ip_addresses/${ip}`, { headers, timeout: 10000 });
        const stats = data.data.attributes.last_analysis_stats;
        return { ip, malicious: stats?.malicious, country: data.data.attributes.country, asn: data.data.attributes.asn, network: data.data.attributes.network };
      }
      default:
        return { success: false, error: `VirusTotal: Unknown operation "${operation}".`, skipped: true };
    }
  },
};
