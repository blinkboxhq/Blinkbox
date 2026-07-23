/**
 * Google Drive — permissions: share, public links, list/update/remove.
 * Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, SUPPORTS_ALL, h } from "../GenericFunctions.js";

async function opShareFile(config, token) {
  if (!config.fileId) return { success: false, error: "Google Drive shareFile: 'fileId' is required.", skipped: true };
  const type = config.shareType || "user";
  if ((type === "user" || type === "group") && !config.email) {
    return { success: false, error: "Google Drive shareFile: 'email' is required when sharing with a user or group.", skipped: true };
  }
  const body = {
    type,
    role: config.role || "reader",
    emailAddress: type === "user" || type === "group" ? config.email : undefined,
    domain: type === "domain" ? config.domain : undefined,
  };
  const res = await axios.post(`${BASE}/files/${encodeURIComponent(config.fileId)}/permissions`, body, {
    headers: h(token, true), timeout: 120000,
    params: { sendNotificationEmail: config.sendNotificationEmail !== false && (type === "user" || type === "group"), ...SUPPORTS_ALL },
  });
  return { permissionId: res.data.id, role: res.data.role, type: res.data.type, shared: true };
}

async function opCreateSharedLink(config, token) {
  if (!config.fileId) return { success: false, error: "Google Drive createSharedLink: 'fileId' is required.", skipped: true };
  await axios.post(`${BASE}/files/${encodeURIComponent(config.fileId)}/permissions`, {
    type: "anyone", role: config.role || "reader",
  }, { headers: h(token, true), timeout: 120000, params: SUPPORTS_ALL });
  const meta = await axios.get(`${BASE}/files/${encodeURIComponent(config.fileId)}`, { headers: h(token), timeout: 120000, params: { fields: "id,name,webViewLink,webContentLink", ...SUPPORTS_ALL } });
  return { fileId: meta.data.id, name: meta.data.name, link: meta.data.webViewLink, downloadLink: meta.data.webContentLink };
}

async function opListPermissions(config, token) {
  if (!config.fileId) return { success: false, error: "Google Drive listPermissions: 'fileId' is required.", skipped: true };
  const res = await axios.get(`${BASE}/files/${encodeURIComponent(config.fileId)}/permissions`, {
    headers: h(token), timeout: 120000,
    params: { fields: "permissions(id,type,role,emailAddress,domain)", ...SUPPORTS_ALL },
  });
  return { permissions: res.data.permissions ?? [], count: res.data.permissions?.length ?? 0 };
}

async function opUpdatePermission(config, token) {
  if (!config.fileId || !config.permissionId) return { success: false, error: "Google Drive updatePermission: 'fileId' and 'permissionId' are required.", skipped: true };
  if (!config.role) return { success: false, error: "Google Drive updatePermission: 'role' is required.", skipped: true };
  const res = await axios.patch(`${BASE}/files/${encodeURIComponent(config.fileId)}/permissions/${encodeURIComponent(config.permissionId)}`, { role: config.role }, {
    headers: h(token, true), timeout: 120000, params: SUPPORTS_ALL,
  });
  return { permissionId: res.data.id, role: res.data.role, updated: true };
}

async function opRemovePermission(config, token) {
  if (!config.fileId || !config.permissionId) return { success: false, error: "Google Drive removePermission: 'fileId' and 'permissionId' are required.", skipped: true };
  await axios.delete(`${BASE}/files/${encodeURIComponent(config.fileId)}/permissions/${encodeURIComponent(config.permissionId)}`, { headers: h(token), timeout: 120000, params: SUPPORTS_ALL });
  return { removed: true, permissionId: config.permissionId };
}

export const permissionOperations = {
  shareFile: opShareFile,
  createSharedLink: opCreateSharedLink,
  listPermissions: opListPermissions,
  updatePermission: opUpdatePermission,
  removePermission: opRemovePermission,
};
