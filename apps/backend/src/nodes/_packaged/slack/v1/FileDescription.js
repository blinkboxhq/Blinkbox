/**
 * Slack — file operations. Handlers receive `(config, token)`.
 */
import axios from "axios";
import { API, MAX_UPLOAD_BYTES, attachmentTooLarge, slackCall } from "../GenericFunctions.js";

async function opUploadFile(config, token) {
  const channel = config.channel;
  if (!channel) return { success: false, error: "Slack uploadFile: 'channel' is required — configure this field.", skipped: true };

  // Binary attachment upload (from AI Agent forwarded files)
  const attachment = Array.isArray(config.attachments) && config.attachments.length > 0
    ? config.attachments[0]
    : null;

  if (attachment?.dataUrl) {
    const base64Data = attachment.dataUrl.includes(",") ? attachment.dataUrl.split(",")[1] : attachment.dataUrl;
    const tooBig = attachmentTooLarge(base64Data, "uploadFile");
    if (tooBig) return tooBig;
    const binaryBuffer = Buffer.from(base64Data, "base64");
    const filename = attachment.name || config.filename || "file";
    const mimeType = attachment.mimeType || "application/octet-stream";

    // Slack Files API v2: get upload URL → upload binary → complete
    const urlRes = await axios.get(`${API}/files.getUploadURLExternal`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { filename, length: binaryBuffer.length },
      timeout: 15000,
    });
    if (!urlRes.data.ok) throw new Error(`Slack: Failed to get upload URL — ${urlRes.data.error}`);
    const { upload_url: uploadUrl, file_id: fileId } = urlRes.data;

    await axios.post(uploadUrl, binaryBuffer, {
      headers: { "Content-Type": mimeType },
      timeout: 60000,
      maxBodyLength: MAX_UPLOAD_BYTES,
    });

    const completeRes = await axios.post(`${API}/files.completeUploadExternal`, {
      files: [{ id: fileId, title: config.title || filename }],
      channel_id: channel,
      initial_comment: config.text || undefined,
    }, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      timeout: 15000,
    });
    if (!completeRes.data.ok) throw new Error(`Slack: Upload completion failed — ${completeRes.data.error}`);
    return { ok: true, fileId, fileName: filename };
  }

  // Text/code snippet upload (legacy path)
  const content = config.content || config.text;
  if (!content) return { success: false, error: "Slack uploadFile: 'content' or 'attachmentIndices' is required.", skipped: true };
  const payload = {
    channels: channel,
    content,
    filename: config.filename || "output.txt",
    filetype: config.filetype || "text",
    title: config.title || config.filename || "File",
  };
  const data = await slackCall(token, "files.upload", payload);
  return { ok: true, fileId: data.file?.id, fileName: data.file?.name, url: data.file?.permalink };
}

export const fileOperations = {
  uploadFile: opUploadFile,
};
