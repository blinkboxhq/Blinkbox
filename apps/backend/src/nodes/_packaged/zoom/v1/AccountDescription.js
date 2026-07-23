/**
 * ZOOM — Recording, Webinar & User resources. New for parity with n8n's Zoom
 * surface: listRecordings, getRecording, deleteRecording, createWebinar,
 * listWebinars, getUser, listUsers. Handlers receive (config, token).
 */
import axios from "axios";
import { BASE, headers } from "../GenericFunctions.js";

async function opListRecordings(config, token) {
  const userId = config.userId || "me";
  const params = new URLSearchParams({ page_size: "30" });
  if (config.from) params.set("from", config.from);
  if (config.to) params.set("to", config.to);
  const res = await axios.get(`${BASE}/users/${encodeURIComponent(userId)}/recordings?${params.toString()}`, { headers: headers(token), timeout: 120000 });
  return { meetings: res.data.meetings || [], total: res.data.total_records };
}

async function opGetRecording(config, token) {
  if (!config.meetingId) return { success: false, error: "Zoom getRecording: 'meetingId' is required.", skipped: true };
  const res = await axios.get(`${BASE}/meetings/${encodeURIComponent(config.meetingId)}/recordings`, { headers: headers(token), timeout: 120000 });
  return { meetingId: String(res.data.id ?? config.meetingId), recordingFiles: res.data.recording_files || [], topic: res.data.topic };
}

async function opDeleteRecording(config, token) {
  if (!config.meetingId) return { success: false, error: "Zoom deleteRecording: 'meetingId' is required.", skipped: true };
  await axios.delete(`${BASE}/meetings/${encodeURIComponent(config.meetingId)}/recordings?action=${config.trash === true ? "trash" : "delete"}`, { headers: headers(token), timeout: 120000 });
  return { deleted: true, meetingId: config.meetingId };
}

async function opCreateWebinar(config, token) {
  const body = {
    topic: config.topic || "Webinar",
    type: parseInt(config.type) || 5,
    duration: parseInt(config.duration) || 60,
    timezone: config.timezone || "UTC",
    agenda: config.agenda || "",
  };
  if (config.startTime) body.start_time = config.startTime;
  const userId = config.userId || "me";
  const res = await axios.post(`${BASE}/users/${encodeURIComponent(userId)}/webinars`, body, { headers: headers(token), timeout: 120000 });
  const w = res.data;
  return { webinarId: String(w.id), topic: w.topic, joinUrl: w.join_url, startUrl: w.start_url, startTime: w.start_time };
}

async function opListWebinars(config, token) {
  const userId = config.userId || "me";
  const res = await axios.get(`${BASE}/users/${encodeURIComponent(userId)}/webinars?page_size=30`, { headers: headers(token), timeout: 120000 });
  return { webinars: res.data.webinars || [], total: res.data.total_records };
}

async function opGetUser(config, token) {
  const userId = config.userId || "me";
  const res = await axios.get(`${BASE}/users/${encodeURIComponent(userId)}`, { headers: headers(token), timeout: 120000 });
  const u = res.data;
  return { userId: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, type: u.type, status: u.status };
}

async function opListUsers(config, token) {
  const status = config.userStatus || "active";
  const res = await axios.get(`${BASE}/users?status=${encodeURIComponent(status)}&page_size=30`, { headers: headers(token), timeout: 120000 });
  return { users: res.data.users || [], total: res.data.total_records };
}

export const accountOperations = {
  listRecordings: opListRecordings,
  getRecording: opGetRecording,
  deleteRecording: opDeleteRecording,
  createWebinar: opCreateWebinar,
  listWebinars: opListWebinars,
  getUser: opGetUser,
  listUsers: opListUsers,
};
