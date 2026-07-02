/**
 * SendGrid — mail send operations: single, dynamic template, bulk.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, auth, parseAddress } from "../GenericFunctions.js";

async function opSendEmail(config, token) {
  if (!config.to) return { success: false, error: "SendGrid sendEmail: 'to' is required — configure this field.", skipped: true };
  if (!config.from) return { success: false, error: "SendGrid sendEmail: 'from' is required — configure this field.", skipped: true };
  if (!config.subject) return { success: false, error: "SendGrid sendEmail: 'subject' is required — configure this field.", skipped: true };
  if (!config.body && !config.html) return { success: false, error: "SendGrid sendEmail: 'body' or 'html' is required — configure this field.", skipped: true };

  const toList = String(config.to).split(",").map((a) => parseAddress(a.trim()));
  const payload = {
    personalizations: [{ to: toList }],
    from: parseAddress(config.from),
    subject: config.subject,
    content: config.html
      ? [{ type: "text/html", value: config.html }]
      : [{ type: "text/plain", value: config.body }],
  };
  if (config.replyTo) payload.reply_to = parseAddress(config.replyTo);

  const response = await axios.post(`${BASE}/mail/send`, payload, { headers: auth(token), timeout: 15000 });
  const messageId = response.headers["x-message-id"] || null;
  return { sent: true, messageId, statusCode: response.status };
}

async function opSendTemplate(config, token) {
  if (!config.to) return { success: false, error: "SendGrid sendTemplate: 'to' is required — configure this field.", skipped: true };
  if (!config.from) return { success: false, error: "SendGrid sendTemplate: 'from' is required — configure this field.", skipped: true };
  if (!config.templateId) return { success: false, error: "SendGrid sendTemplate: 'templateId' is required — configure this field.", skipped: true };

  const toList = String(config.to).split(",").map((a) => parseAddress(a.trim()));
  const dynamicData = typeof config.dynamicData === "string" ? (() => { try { return JSON.parse(config.dynamicData); } catch { throw new Error("SendGrid sendTemplate: 'dynamicData' is not valid JSON."); } })() : (config.dynamicData || {});
  const payload = {
    personalizations: [{ to: toList, dynamic_template_data: dynamicData }],
    from: parseAddress(config.from),
    template_id: config.templateId,
  };
  if (config.subject) payload.subject = config.subject;
  if (config.replyTo) payload.reply_to = parseAddress(config.replyTo);

  const response = await axios.post(`${BASE}/mail/send`, payload, { headers: auth(token), timeout: 15000 });
  return { sent: true, messageId: response.headers["x-message-id"] || null, statusCode: response.status };
}

async function opSendBulk(config, token) {
  // config.recipients: array of { email, name?, data? } or JSON string
  const recipients = typeof config.recipients === "string" ? (() => { try { return JSON.parse(config.recipients); } catch { throw new Error("SendGrid sendBulk: 'recipients' is not valid JSON."); } })() : config.recipients;
  if (!Array.isArray(recipients) || recipients.length === 0)
    return { success: false, error: "SendGrid sendBulk: 'recipients' must be a non-empty array of { email, name?, data? } — configure this field.", skipped: true };
  if (!config.from) return { success: false, error: "SendGrid sendBulk: 'from' is required — configure this field.", skipped: true };
  if (!config.subject) return { success: false, error: "SendGrid sendBulk: 'subject' is required — configure this field.", skipped: true };
  if (!config.body && !config.html && !config.templateId) return { success: false, error: "SendGrid sendBulk: 'body', 'html', or 'templateId' is required — configure this field.", skipped: true };

  const personalizations = recipients.map((r) => ({
    to: [{ email: r.email, name: r.name }],
    ...(r.data ? { dynamic_template_data: r.data } : {}),
  }));

  const payload = {
    personalizations,
    from: parseAddress(config.from),
    subject: config.subject,
  };

  if (config.templateId) {
    payload.template_id = config.templateId;
  } else {
    payload.content = config.html
      ? [{ type: "text/html", value: config.html }]
      : [{ type: "text/plain", value: config.body }];
  }

  const response = await axios.post(`${BASE}/mail/send`, payload, { headers: auth(token), timeout: 20000 });
  return { sent: true, recipientCount: recipients.length, statusCode: response.status };
}

export const mailOperations = {
  sendEmail: opSendEmail,
  sendTemplate: opSendTemplate,
  sendBulk: opSendBulk,
};
