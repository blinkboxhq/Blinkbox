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

const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

// Each event = a predicate over the current analysis (`r`) and the previous
// snapshot (`prev`, may be null on first poll). `eventType` selects the entry.
// `dedup` builds the per-fire idempotency suffix so re-fire-on-change events
// only fire once per distinct verdict, while threshold/state events fire once
// per crossing. `needsPrev` events stay quiet until a baseline exists.
const VT_EVENTS = {
  any_result:          { needsPrev: false, dedup: (r) => `${r.id}:${r.malicious}:${r.lastAnalysisDate || ""}`, match: () => true },
  became_malicious:    { needsPrev: true,  dedup: (r) => `${r.id}:mal`,            match: (r, p) => r.malicious > 0 && p.malicious === 0 },
  malicious_over:      { needsPrev: false, dedup: (r) => `${r.id}:${r.malicious}`, match: (r, _p, c) => r.malicious >= num(c.targetValue, 1) },
  malicious_under:     { needsPrev: false, dedup: (r) => `${r.id}:${r.malicious}`, match: (r, _p, c) => r.totalEngines > 0 && r.malicious <= num(c.targetValue, 0) },
  detection_rate_over: { needsPrev: false, dedup: (r) => `${r.id}:${r.detectionRate}`, match: (r, _p, c) => r.detectionRate >= num(c.targetValue, 5) },
  suspicious_found:    { needsPrev: false, dedup: (r) => `${r.id}:${r.suspicious}`, match: (r) => r.suspicious > 0 },
  clean:               { needsPrev: false, dedup: (r) => `${r.id}:${r.lastAnalysisDate || ""}`, match: (r) => r.totalEngines > 0 && r.malicious === 0 && r.suspicious === 0 },
  engine_count_over:   { needsPrev: false, dedup: (r) => `${r.id}:${r.totalEngines}`, match: (r, _p, c) => r.totalEngines >= num(c.targetValue, 1) },
  verdict_changed:     { needsPrev: true,  dedup: (r) => `${r.id}:${r.malicious}`, match: (r, p) => r.malicious !== p.malicious },
  harmless_majority:   { needsPrev: false, dedup: (r) => `${r.id}:${r.harmless}`, match: (r) => r.totalEngines > 0 && r.harmless * 2 >= r.totalEngines },
  undetected_high:     { needsPrev: false, dedup: (r) => `${r.id}:${r.undetected}`, match: (r, _p, c) => r.undetected >= num(c.targetValue, 1) },
  new_analysis:        { needsPrev: true,  dedup: (r) => `${r.id}:${r.lastAnalysisDate || ""}`, match: (r, p) => !!r.lastAnalysisDate && r.lastAnalysisDate !== p.lastAnalysisDate },
};

export async function pollVirusTotal(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:vt:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { apiKey, scanTarget, scanType = "file" } = cfg;
    if (!apiKey || !scanTarget) return;
    const eventType = cfg.eventType || cfg.watchType || "any_result";
    const spec = VT_EVENTS[eventType] || VT_EVENTS.any_result;

    const result = await fetchVTAnalysis(apiKey, scanTarget, scanType);
    if (!result) return;

    const snapKey = `bb:vt:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prev = prevRaw ? JSON.parse(prevRaw) : null;
    await redis.setex(snapKey, 86400 * 30, JSON.stringify({
      malicious: result.malicious, suspicious: result.suspicious,
      harmless: result.harmless, lastAnalysisDate: result.lastAnalysisDate,
    }));

    if (spec.needsPrev && !prev) return;
    if (!spec.match(result, prev, cfg)) return;

    const seenKey = `bb:vt:seen:${scope}:${eventType}`;
    const dedup = spec.dedup(result);
    const fresh = await redis.sadd(seenKey, dedup);
    await redis.expire(seenKey, 86400 * 30);
    if (!fresh) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    try {
      await executeAutomation(automation, result, {
        workspaceId: automation.workspaceId,
        entryNodeId: triggerNodeId || automation.entryNodeId,
        idempotencyKey: `vt:${scope}:${eventType}:${dedup}`,
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
