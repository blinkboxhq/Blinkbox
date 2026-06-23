/**
 * ZOOM NODE
 * Operations: createMeeting, getMeeting, listMeetings, deleteMeeting, updateMeeting
 */
import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://api.zoom.us/v2";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Zoom");
}

function handleError(err) {
  if (err.message.startsWith("Zoom")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message || err.message;
  if (status === 401) throw new Error("Zoom: OAuth token is invalid or expired — re-authenticate.");
  if (status === 403) throw new Error(`Zoom: Permission denied — ${msg}. Ensure the Zoom app has the required scopes (meeting:write, meeting:read).`);
  if (status === 404) throw new Error("Zoom: Meeting not found.");
  if (status === 400) throw new Error(`Zoom: Bad request — ${msg}`);
  if (status === 429) throw new Error("Zoom: Rate limit exceeded. Retry later.");
  throw new Error(`Zoom failed: ${status || err.code} — ${err.message}`);
}

function headers(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function opCreateMeeting(config, token) {
  const body = {
    topic: config.topic || "Meeting",
    type: parseInt(config.type) || 2,
    duration: parseInt(config.duration) || 60,
    timezone: config.timezone || "UTC",
    agenda: config.agenda || "",
    settings: { host_video: true, participant_video: true },
  };
  if (config.startTime) body.start_time = config.startTime;
  if (config.password) body.password = config.password;

  const userId = config.userId || "me";
  const res = await axios.post(`${BASE}/users/${encodeURIComponent(userId)}/meetings`, body, { headers: headers(token), timeout: 15000 });
  const m = res.data;
  return {
    meetingId: String(m.id),
    topic: m.topic,
    joinUrl: m.join_url,
    startUrl: m.start_url,
    password: m.password,
    startTime: m.start_time,
    duration: m.duration,
    timezone: m.timezone,
  };
}

async function opGetMeeting(config, token) {
  if (!config.meetingId) return { success: false, error: "Zoom getMeeting: 'meetingId' is required.", skipped: true };
  const res = await axios.get(`${BASE}/meetings/${encodeURIComponent(config.meetingId)}`, { headers: headers(token), timeout: 10000 });
  const m = res.data;
  return { meetingId: String(m.id), topic: m.topic, joinUrl: m.join_url, startTime: m.start_time, duration: m.duration, status: m.status };
}

async function opListMeetings(config, token) {
  const userId = config.userId || "me";
  const type = config.listType || "scheduled";
  const res = await axios.get(`${BASE}/users/${encodeURIComponent(userId)}/meetings?type=${encodeURIComponent(type)}&page_size=30`, { headers: headers(token), timeout: 10000 });
  return { meetings: res.data.meetings || [], total: res.data.total_records };
}

async function opDeleteMeeting(config, token) {
  if (!config.meetingId) return { success: false, error: "Zoom deleteMeeting: 'meetingId' is required.", skipped: true };
  await axios.delete(`${BASE}/meetings/${encodeURIComponent(config.meetingId)}`, { headers: headers(token), timeout: 10000 });
  return { deleted: true, meetingId: config.meetingId };
}

async function opUpdateMeeting(config, token) {
  if (!config.meetingId) return { success: false, error: "Zoom updateMeeting: 'meetingId' is required.", skipped: true };
  const body = {};
  if (config.topic) body.topic = config.topic;
  if (config.startTime) body.start_time = config.startTime;
  if (config.duration) body.duration = parseInt(config.duration);
  if (config.agenda) body.agenda = config.agenda;
  if (config.password) body.password = config.password;
  await axios.patch(`${BASE}/meetings/${encodeURIComponent(config.meetingId)}`, body, { headers: headers(token), timeout: 10000 });
  return { updated: true, meetingId: config.meetingId };
}

const OPERATIONS = {
  createMeeting: opCreateMeeting,
  getMeeting: opGetMeeting,
  listMeetings: opListMeetings,
  deleteMeeting: opDeleteMeeting,
  updateMeeting: opUpdateMeeting,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "createMeeting";
    const handler = OPERATIONS[operation];
    if (!handler) throw new Error(`Zoom: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (err) {
      handleError(err);
    }

    try {
      return await handler(config, token);
    } catch (err) {
      handleError(err);
    }
  },
};
