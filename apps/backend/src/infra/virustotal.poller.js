import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

async function fetchVTAnalysis(apiKey, scanTarget, scanType) {
  let url;
  if (scanType === "url") {
    const encoded = Buffer.from(scanTarget).toString("base64url").replace(/=+$/, "");
    url = `https://www.virustotal.com/api/v3/urls/${encoded}`;
  } else if (scanType === "ip") {
    url = `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(scanTarget)}`;
  } else {
    url = `https://www.virustotal.com/api/v3/files/${scanTarget}`;
  }

  const res = await fetch(url, { headers: { "x-apikey": apiKey } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`VirusTotal API ${res.status}`);

  const data = await res.json();
  const a = data.data?.attributes || {};
  const stats = a.last_analysis_stats || {};

  return {
    id: data.data?.id,
    type: scanType,
    name: a.meaningful_name || a.url || a.ip_address || scanTarget,
    sha256: a.sha256,
    malicious: stats.malicious || 0,
    suspicious: stats.suspicious || 0,
    harmless: stats.harmless || 0,
    undetected: stats.undetected || 0,
    totalEngines: Object.values(stats).reduce((s, v) => s + (v || 0), 0),
    detectionRate: stats.malicious && Object.values(stats).reduce((s, v) => s + (v || 0), 0) > 0
      ? Math.round((stats.malicious / Object.values(stats).reduce((s, v) => s + (v || 0), 0)) * 100)
      : 0,
    isMalicious: (stats.malicious || 0) > 0,
    lastAnalysisDate: a.last_analysis_date ? new Date(a.last_analysis_date * 1000).toISOString() : null,
    analysedAt: new Date().toISOString(),
  };
}

export async function pollVirusTotal(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:vt:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { apiKey, scanTarget, scanType = "file" } = cfg;
    if (!apiKey || !scanTarget) return;

    const result = await fetchVTAnalysis(apiKey, scanTarget, scanType);
    if (!result || !result.isMalicious) return;

    const stateKey = `bb:vt:state:${scope}`;
    const lastMalicious = parseInt(await redis.get(stateKey) || "0");
    if (result.malicious <= lastMalicious) return;

    await redis.setex(stateKey, 86400 * 30, String(result.malicious));

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    try {
      await executeAutomation(automation, result, {
        workspaceId: automation.workspaceId,
        entryNodeId: triggerNodeId || automation.entryNodeId,
        idempotencyKey: `vt:${scope}:${result.id}:${result.malicious}`,
      });
    } catch (err) {
      console.error(`[VTPoller] Failed for "${automation.name}":`, err.message);
    }
  } catch (err) {
    console.warn(`[VTPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
