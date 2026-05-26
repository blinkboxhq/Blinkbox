import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export default {
  async run(config, input) {
    if (input?.data?.attributes) return normalizeAnalysis(input);
    const apiKey = config.apiKey || await getOAuthToken(config.credentialId, config.workspaceId, "VirusTotal").catch(() => null);
    if (!apiKey) throw new Error("[virustotal_trigger] API key required");
    const headers = { "x-apikey": apiKey };
    if (config.fileHash) {
      const { data } = await axios.get(`https://www.virustotal.com/api/v3/files/${config.fileHash}`, { headers, timeout: 15000 });
      return normalizeAnalysis(data?.data);
    }
    if (config.url) {
      const encoded = Buffer.from(config.url).toString("base64url");
      const { data } = await axios.get(`https://www.virustotal.com/api/v3/urls/${encoded}`, { headers, timeout: 15000 });
      return normalizeAnalysis(data?.data);
    }
    if (config.ip) {
      const { data } = await axios.get(`https://www.virustotal.com/api/v3/ip_addresses/${config.ip}`, { headers, timeout: 15000 });
      return normalizeAnalysis(data?.data);
    }
    throw new Error("[virustotal_trigger] Provide fileHash, url, or ip in config");
  },
};

function normalizeAnalysis(d) {
  const a = d?.attributes ?? {};
  const stats = a?.last_analysis_stats ?? {};
  const total = Object.values(stats).reduce((s, v) => s + (v || 0), 0);
  return {
    id: d?.id, type: d?.type,
    name: a?.meaningful_name || a?.name || a?.url || a?.ip_address,
    sha256: a?.sha256, md5: a?.md5, sha1: a?.sha1,
    size: a?.size, mimeType: a?.type_description || a?.type_tag,
    malicious: stats.malicious ?? 0, suspicious: stats.suspicious ?? 0,
    undetected: stats.undetected ?? 0, harmless: stats.harmless ?? 0,
    totalEngines: total,
    detectionRate: total > 0 ? `${stats.malicious ?? 0}/${total}` : "0/0",
    isMalicious: (stats.malicious ?? 0) > 0,
    isSuspicious: (stats.suspicious ?? 0) > 2,
    reputation: a?.reputation,
    tags: a?.tags ?? [],
    categories: a?.categories ?? {},
    analysedAt: a?.last_analysis_date ? new Date(a.last_analysis_date * 1000).toISOString() : null,
  };
}
