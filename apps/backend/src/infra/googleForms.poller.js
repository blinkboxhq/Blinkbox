import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const SEEN_TTL = 30 * 24 * 60 * 60;

// questionId -> human title, so users target a question by its label.
async function fetchFormSchema(token, formId) {
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Forms API (schema) ${res.status}`);
  const data = await res.json();
  const map = {};
  for (const item of data.items || []) {
    const qId = item.questionItem?.question?.questionId;
    if (qId) map[qId] = item.title || qId;
  }
  return map;
}

async function fetchFormResponses(token, formId, afterTime, titleMap) {
  const params = new URLSearchParams({ pageSize: "50" });
  if (afterTime) params.set("filter", `timestamp > ${afterTime}`);

  const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Forms API ${res.status}`);
  const data = await res.json();
  return (data.responses || []).map(r => {
    const answers = {};
    const answersByTitle = {};
    let fileCount = 0;
    for (const [qId, a] of Object.entries(r.answers || {})) {
      const textVals = a.textAnswers?.answers?.map(x => x.value) || [];
      const fileVals = a.fileUploadAnswers?.answers?.map(x => x.fileId) || [];
      fileCount += fileVals.length;
      const value = textVals.join(", ") || fileVals.join(", ") || "";
      answers[qId] = value;
      const title = titleMap[qId] || qId;
      answersByTitle[title] = { value, choiceCount: textVals.length, fileCount: fileVals.length };
    }
    return {
      responseId: r.responseId,
      submittedAt: r.lastSubmittedTime,
      respondentEmail: r.respondentEmail || "",
      answers,
      answersByTitle,
      fileCount,
    };
  });
}

function ansFor(resp, title) {
  return resp.answersByTitle?.[title];
}
function ansVal(resp, title) {
  return ansFor(resp, title)?.value ?? "";
}

// Each event = a predicate over a normalized response. Question events read
// cfg.questionTitle (the form question's label) and cfg.targetValue.
const FORMS_EVENTS = {
  new_response:    { match: () => true },
  answer_equals:   { match: (r, c) => String(ansVal(r, c.questionTitle)).trim().toLowerCase() === String(c.targetValue ?? "").trim().toLowerCase() },
  answer_contains: { match: (r, c) => String(ansVal(r, c.questionTitle)).toLowerCase().includes(String(c.targetValue ?? "").toLowerCase()) },
  answer_one_of:   { match: (r, c) => { const v = String(ansVal(r, c.questionTitle)).trim().toLowerCase(); return String(c.targetValue ?? "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean).includes(v); } },
  answer_filled:   { match: (r, c) => String(ansVal(r, c.questionTitle)).trim() !== "" },
  answer_empty:    { match: (r, c) => { const a = ansFor(r, c.questionTitle); return !a || String(a.value).trim() === ""; } },
  rating_over:     { match: (r, c) => Number(ansVal(r, c.questionTitle)) >= Number(c.targetValue || 0) },
  rating_under:    { match: (r, c) => Number(ansVal(r, c.questionTitle)) <= Number(c.targetValue || 0) },
  long_answer:     { match: (r, c) => String(ansVal(r, c.questionTitle)).length >= Number(c.targetValue || 100) },
  multiple_choices:{ match: (r, c) => (ansFor(r, c.questionTitle)?.choiceCount || 0) >= Number(c.targetValue || 2) },
  has_file:        { match: (r) => (r.fileCount || 0) > 0 },
  from_email:      { match: (r, c) => (r.respondentEmail || "").toLowerCase() === String(c.targetValue ?? "").toLowerCase() },
};

export async function pollGoogleForms(automationId, cfg) {
  const lockKey = `bb:gforms:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, formId } = cfg;
    if (!credentialId || !formId) return;
    const eventType = cfg.eventType || cfg.watchType || "new_response";
    const spec = FORMS_EVENTS[eventType] || FORMS_EVENTS.new_response;

    const token = await getOAuthToken(credentialId, workspaceId, "Google Forms Trigger");
    const titleMap = await fetchFormSchema(token, formId);
    const lastTimeKey = `bb:gforms:last:${automationId}`;
    const lastTime = await redis.get(lastTimeKey);
    const responses = await fetchFormResponses(token, formId, lastTime, titleMap);
    if (!responses.length) return;

    await redis.set(lastTimeKey, new Date().toISOString(), "EX", 86400 * 30);

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:gforms:seen:${automationId}:${eventType}`;
    for (const resp of responses) {
      if (!spec.match(resp, cfg)) continue;
      const added = await redis.sadd(seenKey, resp.responseId);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      try {
        await executeAutomation(automation, resp, { workspaceId: automation.workspaceId, idempotencyKey: `gforms:${automation._id}:${eventType}:${resp.responseId}` });
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
