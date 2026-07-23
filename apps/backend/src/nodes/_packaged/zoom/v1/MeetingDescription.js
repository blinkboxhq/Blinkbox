/**
 * ZOOM — Meeting resource. createMeeting / getMeeting / listMeetings /
 * deleteMeeting / updateMeeting preserved verbatim from the monolith;
 * getMeetingInvitation, addRegistrant and listRegistrants added for parity.
 * Handlers receive (config, token).
 */
import axios from "axios";
import { BASE, headers } from "../GenericFunctions.js";

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
  const res = await axios.post(`${BASE}/users/${encodeURIComponent(userId)}/meetings`, body, { headers: headers(token), timeout: 120000 });
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
  const res = await axios.get(`${BASE}/meetings/${encodeURIComponent(config.meetingId)}`, { headers: headers(token), timeout: 120000 });
  const m = res.data;
  return { meetingId: String(m.id), topic: m.topic, joinUrl: m.join_url, startTime: m.start_time, duration: m.duration, status: m.status };
}

async function opListMeetings(config, token) {
  const userId = config.userId || "me";
  const type = config.listType || "scheduled";
  const res = await axios.get(`${BASE}/users/${encodeURIComponent(userId)}/meetings?type=${encodeURIComponent(type)}&page_size=30`, { headers: headers(token), timeout: 120000 });
  return { meetings: res.data.meetings || [], total: res.data.total_records };
}

async function opDeleteMeeting(config, token) {
  if (!config.meetingId) return { success: false, error: "Zoom deleteMeeting: 'meetingId' is required.", skipped: true };
  await axios.delete(`${BASE}/meetings/${encodeURIComponent(config.meetingId)}`, { headers: headers(token), timeout: 120000 });
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
  await axios.patch(`${BASE}/meetings/${encodeURIComponent(config.meetingId)}`, body, { headers: headers(token), timeout: 120000 });
  return { updated: true, meetingId: config.meetingId };
}

async function opGetMeetingInvitation(config, token) {
  if (!config.meetingId) return { success: false, error: "Zoom getMeetingInvitation: 'meetingId' is required.", skipped: true };
  const res = await axios.get(`${BASE}/meetings/${encodeURIComponent(config.meetingId)}/invitation`, { headers: headers(token), timeout: 120000 });
  return { meetingId: config.meetingId, invitation: res.data.invitation };
}

async function opAddRegistrant(config, token) {
  if (!config.meetingId) return { success: false, error: "Zoom addRegistrant: 'meetingId' is required.", skipped: true };
  if (!config.email) return { success: false, error: "Zoom addRegistrant: 'email' is required.", skipped: true };
  const body = { email: config.email, first_name: config.firstName || "Guest" };
  if (config.lastName) body.last_name = config.lastName;
  const res = await axios.post(`${BASE}/meetings/${encodeURIComponent(config.meetingId)}/registrants`, body, { headers: headers(token), timeout: 120000 });
  return { registered: true, registrantId: res.data.registrant_id, joinUrl: res.data.join_url, meetingId: config.meetingId };
}

async function opListRegistrants(config, token) {
  if (!config.meetingId) return { success: false, error: "Zoom listRegistrants: 'meetingId' is required.", skipped: true };
  const status = config.registrantStatus || "approved";
  const res = await axios.get(`${BASE}/meetings/${encodeURIComponent(config.meetingId)}/registrants?status=${encodeURIComponent(status)}&page_size=30`, { headers: headers(token), timeout: 120000 });
  return { registrants: res.data.registrants || [], total: res.data.total_records, meetingId: config.meetingId };
}

export const meetingOperations = {
  createMeeting: opCreateMeeting,
  getMeeting: opGetMeeting,
  listMeetings: opListMeetings,
  deleteMeeting: opDeleteMeeting,
  updateMeeting: opUpdateMeeting,
  getMeetingInvitation: opGetMeetingInvitation,
  addRegistrant: opAddRegistrant,
  listRegistrants: opListRegistrants,
};
