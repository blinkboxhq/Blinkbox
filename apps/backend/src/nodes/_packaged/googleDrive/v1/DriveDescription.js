/**
 * Google Drive — shared drives & account info: listDrives, getAbout.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, h } from "../GenericFunctions.js";

async function opListDrives(config, token) {
  const res = await axios.get(`${BASE}/drives`, { headers: h(token), timeout: 120000, params: { pageSize: Math.min(Number(config.limit || 50), 100) } });
  return { drives: res.data.drives?.map((d) => ({ id: d.id, name: d.name })) ?? [], count: res.data.drives?.length ?? 0 };
}

async function opGetAbout(config, token) {
  const res = await axios.get(`${BASE}/about`, { headers: h(token), timeout: 120000, params: { fields: "user(displayName,emailAddress),storageQuota" } });
  return { user: res.data.user, storageQuota: res.data.storageQuota };
}

export const driveOperations = {
  listDrives: opListDrives,
  getAbout: opGetAbout,
};
