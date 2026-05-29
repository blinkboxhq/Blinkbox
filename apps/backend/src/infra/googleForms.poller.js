import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const SEEN_TTL = 30 * 24 * 60 * 60;

async function fetchFormResponses(token, formId, afterTime) {
  const params = new URLSearchParams({ pageSize: "50" });
  if (afterTime) params.set("filter", `timestamp > ${afterTime}`);

  const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Forms API ${res.status}`);
  const data = await res.json();
  return (data.responses || []).map(r => ({
    responseId: r.responseId,
    submittedAt: r.lastSubmittedTime,
    answers: Object.fromEntries(
      Object.entries(r.answers || {}).map(([qId, a]) => [
        qId,
        a.textAnswers?.answers?.map(x => x.value)?.join(", ") ||
        a.fileUploadAnswers?.answers?.map(x => x.fileId)?.join(", ") || "",
      ])
    ),
  }));
}

export async function pollGoogleForms(automationId, cfg) {
  const lockKey = `bb:gforms:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, formId } = cfg;
    if (!credentialId || !formId) return;

    const token = await getOAuthToken(credentialId, workspaceId, "Google Forms Trigger");
    const lastTimeKey = `bb:gforms:last:${automationId}`;
    const lastTime = await redis.get(lastTimeKey);
    const responses = await fetchFormResponses(token, formId, lastTime);
    if (!responses.length) return;

    await redis.set(lastTimeKey, new Date().toISOString(), "EX", 86400 * 30);

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:gforms:seen:${automationId}`;
    for (const resp of responses) {
      const added = await redis.sadd(seenKey, resp.responseId);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, resp, { workspaceId: automation.workspaceId, idempotencyKey: `gforms:${automation._id}:${resp.responseId}` });
      } catch (err) {
        console.error(`[GFormsPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[GFormsPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
