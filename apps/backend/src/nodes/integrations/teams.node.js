/**
 * TEAMS NODE
 * Microsoft Graph API — channels, messages, meetings.
 *
 * Operations:
 *   sendMessage     — Send a message to a team channel
 *   sendCard        — Send an Adaptive Card to a team channel
 *   replyMessage    — Reply to a thread in a channel
 *   createChannel   — Create a new channel in a team
 *   listChannels    — List channels in a team
 *   listTeams       — List teams the authenticated user is a member of
 *   createMeeting   — Create an online meeting (Teams link included)
 *
 * Auth: Microsoft 365 OAuth token stored in credential vault
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const GRAPH = "https://graph.microsoft.com/v1.0";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Teams");
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function handleError(err) {
  if (err.message?.startsWith("Teams")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.message;
  if (status === 401) throw new Error(`Teams: Authentication failed — token may have expired. Re-authorise the credential.`);
  if (status === 403) throw new Error(`Teams: Insufficient permissions — ${msg}. Ensure Teams Graph scopes are granted.`);
  if (status === 404) throw new Error(`Teams: Resource not found — ${msg}. Check teamId and channelId values.`);
  if (status === 429) throw new Error(`Teams: Rate limit exceeded. Retry after a short delay.`);
  throw new Error(`Teams: ${status ?? "Network"} error — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "sendMessage" } = config;

    if (!config.credentialId) {
      return { success: false, error: "Teams: No credential selected — pick a Microsoft 365 OAuth credential.", skipped: true };
    }

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Teams: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const headers = authHeaders(token);

    try {
      switch (operation) {
        case "sendMessage": {
          const { teamId, channelId, content } = config;
          if (!teamId) return { success: false, error: "Teams sendMessage: 'teamId' is required.", skipped: true };
          if (!channelId) return { success: false, error: "Teams sendMessage: 'channelId' is required.", skipped: true };
          if (!content) return { success: false, error: "Teams sendMessage: 'content' is required.", skipped: true };

          const res = await axios.post(
            `${GRAPH}/teams/${teamId}/channels/${channelId}/messages`,
            { body: { contentType: "text", content } },
            { headers, timeout: 20000 }
          );
          return { success: true, id: res.data.id, createdDateTime: res.data.createdDateTime, webUrl: res.data.webUrl };
        }

        case "sendCard": {
          const { teamId, channelId, card } = config;
          if (!teamId) return { success: false, error: "Teams sendCard: 'teamId' is required.", skipped: true };
          if (!channelId) return { success: false, error: "Teams sendCard: 'channelId' is required.", skipped: true };
          if (!card) return { success: false, error: "Teams sendCard: 'card' (Adaptive Card JSON) is required.", skipped: true };

          let parsedCard;
          try {
            parsedCard = typeof card === "string" ? JSON.parse(card) : card;
          } catch {
            return { success: false, error: "Teams sendCard: 'card' is not valid JSON.", skipped: true };
          }

          const res = await axios.post(
            `${GRAPH}/teams/${teamId}/channels/${channelId}/messages`,
            {
              body: { contentType: "html", content: "<attachment id=\"1\"></attachment>" },
              attachments: [
                {
                  id: "1",
                  contentType: "application/vnd.microsoft.card.adaptive",
                  content: JSON.stringify(parsedCard),
                },
              ],
            },
            { headers, timeout: 20000 }
          );
          return { success: true, id: res.data.id, createdDateTime: res.data.createdDateTime, webUrl: res.data.webUrl };
        }

        case "replyMessage": {
          const { teamId, channelId, messageId, content } = config;
          if (!teamId) return { success: false, error: "Teams replyMessage: 'teamId' is required.", skipped: true };
          if (!channelId) return { success: false, error: "Teams replyMessage: 'channelId' is required.", skipped: true };
          if (!messageId) return { success: false, error: "Teams replyMessage: 'messageId' is required.", skipped: true };
          if (!content) return { success: false, error: "Teams replyMessage: 'content' is required.", skipped: true };

          const res = await axios.post(
            `${GRAPH}/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`,
            { body: { contentType: "text", content } },
            { headers, timeout: 20000 }
          );
          return { success: true, id: res.data.id, createdDateTime: res.data.createdDateTime };
        }

        case "createChannel": {
          const { teamId, displayName, description, membershipType } = config;
          if (!teamId) return { success: false, error: "Teams createChannel: 'teamId' is required.", skipped: true };
          if (!displayName) return { success: false, error: "Teams createChannel: 'displayName' is required.", skipped: true };

          const body = {
            displayName,
            membershipType: membershipType || "standard",
          };
          if (description) body.description = description;

          const res = await axios.post(`${GRAPH}/teams/${teamId}/channels`, body, { headers, timeout: 20000 });
          return { success: true, id: res.data.id, displayName: res.data.displayName, webUrl: res.data.webUrl };
        }

        case "listChannels": {
          const { teamId } = config;
          if (!teamId) return { success: false, error: "Teams listChannels: 'teamId' is required.", skipped: true };

          const res = await axios.get(`${GRAPH}/teams/${teamId}/channels`, { headers, timeout: 15000 });
          return {
            success: true,
            count: res.data.value.length,
            channels: res.data.value.map((c) => ({
              id: c.id,
              displayName: c.displayName,
              description: c.description,
              membershipType: c.membershipType,
              webUrl: c.webUrl,
            })),
          };
        }

        case "listTeams": {
          const res = await axios.get(`${GRAPH}/me/joinedTeams`, { headers, timeout: 15000 });
          return {
            success: true,
            count: res.data.value.length,
            teams: res.data.value.map((t) => ({
              id: t.id,
              displayName: t.displayName,
              description: t.description,
              visibility: t.visibility,
            })),
          };
        }

        case "createMeeting": {
          const { subject, startDateTime, endDateTime, attendees } = config;
          if (!subject) return { success: false, error: "Teams createMeeting: 'subject' is required.", skipped: true };
          if (!startDateTime) return { success: false, error: "Teams createMeeting: 'startDateTime' is required.", skipped: true };
          if (!endDateTime) return { success: false, error: "Teams createMeeting: 'endDateTime' is required.", skipped: true };

          const body = {
            subject,
            startDateTime,
            endDateTime,
          };
          if (attendees) {
            body.participants = {
              attendees: String(attendees)
                .split(",")
                .map((e) => e.trim())
                .filter(Boolean)
                .map((upn) => ({ upn, role: "attendee" })),
            };
          }

          const res = await axios.post(`${GRAPH}/me/onlineMeetings`, body, { headers, timeout: 20000 });
          return {
            success: true,
            id: res.data.id,
            subject: res.data.subject,
            joinUrl: res.data.joinWebUrl,
            startDateTime: res.data.startDateTime,
            endDateTime: res.data.endDateTime,
          };
        }

        default:
          return { success: false, error: `Teams: Unknown operation "${operation}".`, skipped: true };
      }
    } catch (err) {
      handleError(err);
    }
  },
};
