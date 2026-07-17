/**
 * WhatsApp (Meta Cloud API) — shared primitives.
 * `send()` posts a message payload to the Graph API; `handleError` maps the
 * Meta error surface; `uploadMedia` uploads a base64 attachment and returns its
 * media id. All extracted verbatim from the monolith.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const API_VERSION = "v21.0";

export async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "WhatsApp");
}

export function handleError(err) {
  if (err.message.startsWith("WhatsApp")) throw err;
  if (err.response?.status === 401) throw new Error("WhatsApp: Invalid or expired access token.");
  if (err.response?.status === 400) {
    const detail = err.response?.data?.error?.message || err.message;
    const errorCode = err.response?.data?.error?.code;
    if (errorCode === 131030) throw new Error("WhatsApp: Recipient phone number is not registered on WhatsApp.");
    if (errorCode === 131047) throw new Error("WhatsApp: Re-engagement message blocked — user must initiate conversation first.");
    if (errorCode === 132000) throw new Error(`WhatsApp: Template error — ${detail}`);
    throw new Error(`WhatsApp: Bad request — ${detail}`);
  }
  if (err.response?.status === 403) throw new Error("WhatsApp: Access denied. Check your Meta app permissions and phone number ID.");
  if (err.response?.status === 404) throw new Error("WhatsApp: Phone number ID not found. Verify it in Meta Business dashboard.");
  if (err.response?.status === 429) throw new Error("WhatsApp: Rate limit exceeded. Retry later.");
  if (err.response?.status === 500) throw new Error("WhatsApp: Meta server error (500). Retry later.");
  if (err.code === "ECONNABORTED") throw new Error("WhatsApp: Request timed out.");
  throw new Error(`WhatsApp failed: ${err.response?.status || err.code} — ${err.message}`);
}

export async function send(phoneNumberId, token, payload) {
  const url = `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(phoneNumberId)}/messages`;
  const response = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    timeout: 15000,
  });
  if (response.data?.error) {
    const { message, code } = response.data.error;
    if (code === 131030) throw new Error("WhatsApp: Recipient phone number is not registered on WhatsApp.");
    if (code === 131047) throw new Error("WhatsApp: Re-engagement message blocked — user must initiate conversation first.");
    if (code === 132000) throw new Error(`WhatsApp: Template error — ${message}`);
    throw new Error(`WhatsApp API error ${code}: ${message}`);
  }
  return {
    messageId: response.data.messages?.[0]?.id,
    contacts: response.data.contacts,
    messages: response.data.messages,
  };
}

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export function attachmentTooLarge(base64, op) {
  const bytes = Math.floor((String(base64).length * 3) / 4);
  if (bytes <= MAX_UPLOAD_BYTES) return null;
  return { success: false, error: `WhatsApp ${op}: attachment is ~${Math.round(bytes / 1048576)}MB — over the ${MAX_UPLOAD_BYTES / 1048576}MB upload limit.`, skipped: true };
}

export async function uploadMedia(phoneNumberId, token, attachment) {
  const base64Data = attachment.dataUrl.includes(",") ? attachment.dataUrl.split(",")[1] : attachment.dataUrl;
  const mimeType = attachment.mimeType || "application/octet-stream";
  const filename = attachment.name || `file.${mimeType.split("/")[1] || "bin"}`;
  const form = new FormData();
  form.append("file", new Blob([Buffer.from(base64Data, "base64")], { type: mimeType }), filename);
  form.append("type", mimeType);
  form.append("messaging_product", "whatsapp");
  const { data } = await axios.post(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}/media`,
    form,
    { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
  );
  return data.id;
}

export function makeReq(token) {
  return token;
}
