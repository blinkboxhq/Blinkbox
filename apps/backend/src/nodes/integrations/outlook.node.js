/**
 * OUTLOOK NODE
 * Microsoft Graph API — email, calendar, contacts.
 *
 * Operations:
 *   sendEmail       — Send a new email
 *   replyEmail      — Reply to an existing message
 *   getEmail        — Get a single message by ID
 *   listEmails      — List messages in inbox (with optional filter)
 *   createEvent     — Create a calendar event
 *   getCalendar     — List calendar events in a date range
 *   createContact   — Create a contact
 *   moveEmail       — Move a message to a folder
 *   flagEmail       — Flag or unflag a message
 *
 * Auth: Microsoft 365 OAuth token stored in credential vault
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const GRAPH = "https://graph.microsoft.com/v1.0";

async function getToken(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Outlook");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function handleError(err) {
  if (err.message?.startsWith("Outlook")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.message;
  if (status === 401) throw new Error(`Outlook: Authentication failed — token may have expired. Re-authorise the credential.`);
  if (status === 403) throw new Error(`Outlook: Insufficient permissions — ${msg}. Ensure the required Graph scopes are granted.`);
  if (status === 404) throw new Error(`Outlook: Resource not found — ${msg}`);
  if (status === 429) throw new Error(`Outlook: Rate limit exceeded. Retry after a short delay.`);
  throw new Error(`Outlook: ${status ?? "Network"} error — ${msg}`);
}

function buildRecipients(csv) {
  return String(csv)
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address } }));
}

export default {
  async run(config, input, context = {}) {
    const { operation = "sendEmail" } = config;

    if (!config.credentialId) {
      return { success: false, error: "Outlook: No credential selected — pick a Microsoft 365 OAuth credential.", skipped: true };
    }

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Outlook: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const headers = authHeaders(token);

    try {
      switch (operation) {
        case "sendEmail": {
          const { to, cc, subject, body, isHtml } = config;
          if (!to) return { success: false, error: "Outlook sendEmail: 'to' is required.", skipped: true };
          if (!subject) return { success: false, error: "Outlook sendEmail: 'subject' is required.", skipped: true };

          const message = {
            subject,
            body: { contentType: isHtml ? "HTML" : "Text", content: body || "" },
            toRecipients: buildRecipients(to),
          };
          if (cc) message.ccRecipients = buildRecipients(cc);

          await axios.post(`${GRAPH}/me/sendMail`, { message }, { headers, timeout: 20000 });
          return { success: true, operation: "sendEmail", to, subject };
        }

        case "replyEmail": {
          const { messageId, to, body, isHtml } = config;
          if (!messageId) return { success: false, error: "Outlook replyEmail: 'messageId' is required.", skipped: true };
          if (!to) return { success: false, error: "Outlook replyEmail: 'to' is required.", skipped: true };

          await axios.post(
            `${GRAPH}/me/messages/${messageId}/reply`,
            {
              message: {
                toRecipients: buildRecipients(to),
                body: { contentType: isHtml ? "HTML" : "Text", content: body || "" },
              },
            },
            { headers, timeout: 20000 }
          );
          return { success: true, operation: "replyEmail", messageId };
        }

        case "getEmail": {
          const { messageId } = config;
          if (!messageId) return { success: false, error: "Outlook getEmail: 'messageId' is required.", skipped: true };

          const res = await axios.get(`${GRAPH}/me/messages/${messageId}`, { headers, timeout: 15000 });
          const m = res.data;
          return {
            success: true,
            id: m.id,
            subject: m.subject,
            from: m.from?.emailAddress?.address,
            receivedDateTime: m.receivedDateTime,
            bodyPreview: m.bodyPreview,
            isRead: m.isRead,
            body: m.body?.content,
          };
        }

        case "listEmails": {
          const limit = parseInt(config.limit) || 20;
          const filter = config.filter || "";
          const params = { $top: limit, $orderby: "receivedDateTime desc" };
          if (filter) params.$filter = filter;

          const res = await axios.get(`${GRAPH}/me/messages`, { headers, params, timeout: 15000 });
          return {
            success: true,
            count: res.data.value.length,
            messages: res.data.value.map((m) => ({
              id: m.id,
              subject: m.subject,
              from: m.from?.emailAddress?.address,
              receivedDateTime: m.receivedDateTime,
              bodyPreview: m.bodyPreview,
              isRead: m.isRead,
            })),
          };
        }

        case "createEvent": {
          const { subject, start, end, attendees, location } = config;
          if (!subject) return { success: false, error: "Outlook createEvent: 'subject' is required.", skipped: true };
          if (!start) return { success: false, error: "Outlook createEvent: 'start' datetime is required.", skipped: true };
          if (!end) return { success: false, error: "Outlook createEvent: 'end' datetime is required.", skipped: true };

          const body = {
            subject,
            start: { dateTime: start, timeZone: "UTC" },
            end: { dateTime: end, timeZone: "UTC" },
          };
          if (attendees) {
            body.attendees = String(attendees)
              .split(",")
              .map((e) => e.trim())
              .filter(Boolean)
              .map((address) => ({ emailAddress: { address }, type: "required" }));
          }
          if (location) body.location = { displayName: location };

          const res = await axios.post(`${GRAPH}/me/events`, body, { headers, timeout: 20000 });
          return { success: true, id: res.data.id, subject: res.data.subject, webLink: res.data.webLink };
        }

        case "getCalendar": {
          const { startDate, endDate } = config;
          const params = { $orderby: "start/dateTime" };
          if (startDate) params.startDateTime = new Date(startDate).toISOString();
          if (endDate) params.endDateTime = new Date(endDate).toISOString();

          const url = startDate || endDate
            ? `${GRAPH}/me/calendarView`
            : `${GRAPH}/me/events`;

          const res = await axios.get(url, { headers, params, timeout: 15000 });
          return {
            success: true,
            count: res.data.value.length,
            events: res.data.value.map((e) => ({
              id: e.id,
              subject: e.subject,
              start: e.start?.dateTime,
              end: e.end?.dateTime,
              location: e.location?.displayName,
              organizer: e.organizer?.emailAddress?.address,
              webLink: e.webLink,
            })),
          };
        }

        case "createContact": {
          const { firstName, lastName, email } = config;
          if (!firstName && !lastName) return { success: false, error: "Outlook createContact: at least first or last name is required.", skipped: true };

          const body = { givenName: firstName || "", surname: lastName || "" };
          if (email) body.emailAddresses = [{ address: email, name: `${firstName || ""} ${lastName || ""}`.trim() }];

          const res = await axios.post(`${GRAPH}/me/contacts`, body, { headers, timeout: 20000 });
          return { success: true, id: res.data.id, displayName: res.data.displayName };
        }

        case "moveEmail": {
          const { messageId, destinationId } = config;
          if (!messageId) return { success: false, error: "Outlook moveEmail: 'messageId' is required.", skipped: true };
          if (!destinationId) return { success: false, error: "Outlook moveEmail: 'destinationId' (folder ID or well-known name) is required.", skipped: true };

          const res = await axios.post(
            `${GRAPH}/me/messages/${messageId}/move`,
            { destinationId },
            { headers, timeout: 15000 }
          );
          return { success: true, id: res.data.id, subject: res.data.subject };
        }

        case "flagEmail": {
          const { messageId } = config;
          if (!messageId) return { success: false, error: "Outlook flagEmail: 'messageId' is required.", skipped: true };
          const flagged = config.flagged !== false;
          const res = await axios.patch(
            `${GRAPH}/me/messages/${messageId}`,
            { flag: { flagStatus: flagged ? "flagged" : "notFlagged" } },
            { headers, timeout: 15000 }
          );
          return { success: true, id: res.data.id, flagStatus: res.data.flag?.flagStatus };
        }

        default:
          return { success: false, error: `Outlook: Unknown operation "${operation}".`, skipped: true };
      }
    } catch (err) {
      handleError(err);
    }
  },
};
