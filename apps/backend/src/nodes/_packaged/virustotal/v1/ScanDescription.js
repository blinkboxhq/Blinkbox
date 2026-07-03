/**
 * VIRUSTOTAL — Scan & Report resource. scanUrl/getUrlReport/scanFile/getIpReport
 * preserved verbatim from the monolith; submitUrl, rescanFile, getDomainReport,
 * getFileBehaviour, searchComments added for parity. Handlers receive
 * (config, client).
 */
import { encodeUrlId } from "../GenericFunctions.js";

async function opScanUrl(config, client) {
  const url = config.url;
  if (!url) return { success: false, error: "virustotal scanUrl: 'url' is required.", skipped: true };
  const res = await client.get(`/urls/${encodeUrlId(url)}`);
  const stats = res.data.data?.attributes?.last_analysis_stats || {};
  return { url, malicious: stats.malicious, suspicious: stats.suspicious, harmless: stats.harmless, undetected: stats.undetected, stats };
}

async function opGetUrlReport(config, client) {
  const url = config.url;
  if (!url) return { success: false, error: "virustotal getUrlReport: 'url' is required.", skipped: true };
  const res = await client.get(`/urls/${encodeUrlId(url)}`);
  return res.data.data?.attributes || {};
}

async function opSubmitUrl(config, client) {
  const url = config.url;
  if (!url) return { success: false, error: "virustotal submitUrl: 'url' is required.", skipped: true };
  const res = await client.post(`/urls`, new URLSearchParams({ url }), { headers: { "content-type": "application/x-www-form-urlencoded" } });
  return { analysisId: res.data.data?.id, type: res.data.data?.type, submitted: true };
}

async function opScanFile(config, client) {
  const hash = config.hash;
  if (!hash) return { success: false, error: "virustotal scanFile: 'hash' is required.", skipped: true };
  const res = await client.get(`/files/${hash}`);
  const stats = res.data.data?.attributes?.last_analysis_stats || {};
  return { hash, malicious: stats.malicious, suspicious: stats.suspicious, harmless: stats.harmless, stats };
}

async function opRescanFile(config, client) {
  const hash = config.hash;
  if (!hash) return { success: false, error: "virustotal rescanFile: 'hash' is required.", skipped: true };
  const res = await client.post(`/files/${hash}/analyse`);
  return { hash, analysisId: res.data.data?.id, submitted: true };
}

async function opGetFileBehaviour(config, client) {
  const hash = config.hash;
  if (!hash) return { success: false, error: "virustotal getFileBehaviour: 'hash' is required.", skipped: true };
  const res = await client.get(`/files/${hash}/behaviours`);
  return { hash, behaviours: (res.data.data || []).map((b) => ({ sandbox: b.attributes?.sandbox_name, verdict: b.attributes?.verdicts })), count: (res.data.data || []).length };
}

async function opGetIpReport(config, client) {
  const ip = config.ip;
  if (!ip) return { success: false, error: "virustotal getIpReport: 'ip' is required.", skipped: true };
  const res = await client.get(`/ip_addresses/${ip}`);
  const stats = res.data.data?.attributes?.last_analysis_stats || {};
  return { ip, malicious: stats.malicious, suspicious: stats.suspicious, harmless: stats.harmless, stats };
}

async function opGetDomainReport(config, client) {
  const domain = config.domain;
  if (!domain) return { success: false, error: "virustotal getDomainReport: 'domain' is required.", skipped: true };
  const res = await client.get(`/domains/${domain}`);
  const attrs = res.data.data?.attributes || {};
  const stats = attrs.last_analysis_stats || {};
  return { domain, malicious: stats.malicious, suspicious: stats.suspicious, harmless: stats.harmless, reputation: attrs.reputation, stats };
}

async function opSearchComments(config, client) {
  const query = config.query;
  if (!query) return { success: false, error: "virustotal searchComments: 'query' is required.", skipped: true };
  const res = await client.get(`/search?query=${encodeURIComponent(query)}`);
  return { results: res.data.data || [], count: (res.data.data || []).length };
}

export const scanOperations = {
  scanUrl: opScanUrl,
  getUrlReport: opGetUrlReport,
  submitUrl: opSubmitUrl,
  scanFile: opScanFile,
  rescanFile: opRescanFile,
  getFileBehaviour: opGetFileBehaviour,
  getIpReport: opGetIpReport,
  getDomainReport: opGetDomainReport,
  searchComments: opSearchComments,
};
