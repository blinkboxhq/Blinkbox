/**
 * WhatsApp (Meta Cloud API) webhook classifier.
 * The Cloud API has no polling endpoint — events arrive as POST callbacks to
 * the public webhook URL. A single subscription delivers every change type, so
 * each Blinkbox "event" is a predicate over the incoming payload. This lets one
 * webhook URL drive many distinct triggers by dropping non-matching payloads.
 *
 * Payload shape (Meta): { entry: [{ changes: [{ value: { messages, statuses,
 * contacts, metadata, ... } }] }] }
 */
const lc = (s) => String(s ?? "").toLowerCase();

export function firstChange(body) {
  return body?.entry?.[0]?.changes?.[0]?.value || {};
}

function firstMessage(value) {
  return (value.messages || [])[0] || null;
}

function firstStatus(value) {
  return (value.statuses || [])[0] || null;
}

// Each predicate receives the change `value` and the trigger config.
const PREDICATES = {
  message_received: (v) => !!firstMessage(v),
  text_message:     (v) => firstMessage(v)?.type === "text",
  image_message:    (v) => firstMessage(v)?.type === "image",
  document_message: (v) => firstMessage(v)?.type === "document",
  audio_message:    (v) => ["audio", "voice"].includes(firstMessage(v)?.type),
  video_message:    (v) => firstMessage(v)?.type === "video",
  location_message: (v) => firstMessage(v)?.type === "location",
  button_reply:     (v) => {
    const m = firstMessage(v);
    return m?.type === "button" || m?.interactive?.type === "button_reply" || m?.type === "interactive";
  },
  text_contains:    (v, cfg) => {
    const m = firstMessage(v);
    const text = m?.text?.body || m?.button?.text || m?.interactive?.button_reply?.title || "";
    return !!cfg.targetValue && lc(text).includes(lc(cfg.targetValue));
  },
  message_delivered: (v) => firstStatus(v)?.status === "delivered",
  message_read:      (v) => firstStatus(v)?.status === "read",
  message_failed:    (v) => firstStatus(v)?.status === "failed",
};

export const WHATSAPP_EVENTS = Object.keys(PREDICATES);

/**
 * Returns true if the payload matches the trigger's selected event.
 * Unknown event types pass through (treated as "any message").
 */
export function matchesWhatsappEvent(body, eventType, cfg = {}) {
  const value = firstChange(body);
  // Ignore Meta's status-less sync echoes that carry neither messages nor statuses.
  if (!value.messages && !value.statuses) return false;
  const predicate = PREDICATES[eventType];
  if (!predicate) return !!firstMessage(value);
  return predicate(value, cfg);
}

/**
 * Flattens the Meta payload into the friendly $trigger.* variables the
 * frontend advertises, so users never touch raw nested JSON.
 */
export function shapeWhatsappPayload(body) {
  const value = firstChange(body);
  const m = firstMessage(value);
  const s = firstStatus(value);
  const contact = (value.contacts || [])[0] || {};
  const text = m?.text?.body
    || m?.button?.text
    || m?.interactive?.button_reply?.title
    || m?.interactive?.list_reply?.title
    || m?.caption
    || "";
  return {
    from: m?.from || s?.recipient_id,
    fromName: contact?.profile?.name,
    messageId: m?.id || s?.id,
    type: m?.type,
    text,
    timestamp: m?.timestamp,
    status: s?.status,
    phoneNumberId: value.metadata?.phone_number_id,
    raw: body,
  };
}
