import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const BASE = "https://api.typeform.com";
const SEEN_TTL = 30 * 24 * 60 * 60;

function answerText(a) {
  switch (a.type) {
    case "text": return a.text || "";
    case "email": return a.email || "";
    case "url": return a.url || "";
    case "phone_number": return a.phone_number || "";
    case "number": return String(a.number ?? "");
    case "boolean": return a.boolean ? "true" : "false";
    case "date": return a.date || "";
    case "choice": return a.choice?.label || a.choice?.other || "";
    case "choices": return (a.choices?.labels || []).join(", ");
    case "file_url": return a.file_url || "";
    case "payment": return a.payment?.amount || "";
    default: return "";
  }
}

// Pull a form's most-recent responses and normalize the fields the event
// predicates compare. Answers are flattened into a list of {ref, title, type,
// value} plus a single joined `allText` for substring matching.
async function fetchResponses(token, formId) {
  const params = new URLSearchParams({ page_size: "50", sort: "submitted_at,desc" });
  const res = await fetch(`${BASE}/forms/${encodeURIComponent(formId)}/responses?${params}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Typeform API ${res.status}`);
  const data = await res.json();
  return (data.items || []).map((r) => {
    const answers = (r.answers || []).map((a) => ({
      ref: a.field?.ref || "",
      title: a.field?.title || "",
      id: a.field?.id || "",
      type: a.type || "",
      value: answerText(a),
    }));
    return {
      token: String(r.token || r.response_id || ""),
      submittedAt: r.submitted_at || "",
      landedAt: r.landed_at || "",
      completed: r.submitted_at ? true : false,
      score: r.calculated?.score ?? null,
      hidden: r.hidden || {},
      referrer: r.metadata?.referer || "",
      platform: r.metadata?.platform || "",
      answers,
      allText: answers.map((a) => a.value).filter(Boolean).join(" │ "),
    };
  });
}

const lc = (s) => String(s ?? "").toLowerCase();
// Find an answer by field ref, id, or (case-insensitive) title.
const findAnswer = (r, key) => {
  const k = lc(key);
  return r.answers.find((a) => lc(a.ref) === k || lc(a.id) === k || lc(a.title) === k);
};

// Each event is a predicate over the current response (`r`) and config (`c`).
// Responses are immutable once submitted, so dedup is the bare response token
// (or token + a content discriminator); none of these need a prior snapshot.
const TYPEFORM_EVENTS = {
  response_submitted: { dedup: (r) => `${r.token}`, match: (r) => r.completed },
  any_response:       { dedup: (r) => `${r.token}`, match: () => true },
  partial:            { dedup: (r) => `${r.token}:partial`, match: (r) => !r.completed && !!r.landedAt },
  field_answered:     { dedup: (r) => `${r.token}`, match: (r, c) => { const a = findAnswer(r, c.targetValue); return !!a && a.value !== ""; } },
  answer_equals:      { dedup: (r) => `${r.token}`, match: (r, c) => { const [k, v] = String(c.targetValue || "").split("="); const a = findAnswer(r, (k || "").trim()); return !!a && lc(a.value) === lc((v || "").trim()); } },
  answer_contains:    { dedup: (r) => `${r.token}`, match: (r, c) => lc(r.allText).includes(lc(c.targetValue)) },
  choice_selected:    { dedup: (r) => `${r.token}`, match: (r, c) => r.answers.some((a) => (a.type === "choice" || a.type === "choices") && lc(a.value).includes(lc(c.targetValue))) },
  email_provided:     { dedup: (r) => `${r.token}`, match: (r) => r.answers.some((a) => a.type === "email" && a.value) },
  score_over:         { dedup: (r) => `${r.token}`, match: (r, c) => r.score != null && Number(r.score) >= Number(c.targetValue || 0) },
  score_under:        { dedup: (r) => `${r.token}`, match: (r, c) => r.score != null && Number(r.score) <= Number(c.targetValue || 0) },
  has_hidden_field:   { dedup: (r) => `${r.token}`, match: (r, c) => Object.prototype.hasOwnProperty.call(r.hidden, String(c.targetValue || "").trim()) },
  from_referrer:      { dedup: (r) => `${r.token}`, match: (r, c) => lc(r.referrer).includes(lc(c.targetValue)) },
};

export async function pollTypeform(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:typeform:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, formId } = cfg;
    if (!credentialId || !formId) return;
    const eventType = cfg.eventType || cfg.watchType || "response_submitted";
    const spec = TYPEFORM_EVENTS[eventType] || TYPEFORM_EVENTS.response_submitted;

    const token = await getOAuthToken(credentialId, workspaceId, "Typeform Trigger");
    const responses = await fetchResponses(token, formId);
    if (!responses.length) return;

    const seenKey = `bb:typeform:seen:${scope}:${eventType}`;
    const firstSync = (await redis.exists(seenKey)) === 0;

    // First sync: backfill the seen set so we never replay historical responses,
    // then return without firing.
    if (firstSync) {
      const tokens = responses.map((r) => spec.dedup(r));
      if (tokens.length) {
        await redis.sadd(seenKey, ...tokens);
        await redis.expire(seenKey, SEEN_TTL);
      }
      return;
    }

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    for (const r of responses) {
      if (!spec.match(r, cfg)) continue;

      const dedup = spec.dedup(r);
      const fresh = await redis.sadd(seenKey, dedup);
      if (!fresh) continue;
      await redis.expire(seenKey, SEEN_TTL);

      try {
        await executeAutomation(automation, {
          responseToken: r.token, submittedAt: r.submittedAt, landedAt: r.landedAt,
          completed: r.completed, score: r.score, referrer: r.referrer,
          platform: r.platform, hidden: r.hidden,
          answers: r.answers.reduce((m, a) => { if (a.title) m[a.title] = a.value; return m; }, {}),
          answersList: r.answers, formId,
        }, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `typeform:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[TypeformPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[TypeformPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
