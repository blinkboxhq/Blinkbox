/**
 * ONEDRIVE — Sharing resource. shareFile preserved verbatim from the monolith;
 * listPermissions, deletePermission and invite added for parity. Handlers
 * receive (config, ctx) where ctx = { token, headers }.
 */
import axios from "axios";
import { itemUrl } from "../GenericFunctions.js";

async function opShareFile(config, ctx) {
  const { headers } = ctx;
  const { path, linkType, scope } = config;
  if (!path) return { success: false, error: "OneDrive shareFile: 'path' or item ID is required.", skipped: true };

  const res = await axios.post(
    `${itemUrl(path)}/createLink`,
    { type: linkType || "view", scope: scope || "anonymous" },
    { headers, timeout: 15000 }
  );
  return { success: true, link: res.data.link?.webUrl, type: res.data.link?.type, scope: res.data.link?.scope };
}

async function opListPermissions(config, ctx) {
  const { headers } = ctx;
  const { path } = config;
  if (!path) return { success: false, error: "OneDrive listPermissions: 'path' or item ID is required.", skipped: true };
  const res = await axios.get(`${itemUrl(path)}/permissions`, { headers, timeout: 15000 });
  return {
    success: true,
    count: res.data.value.length,
    permissions: res.data.value.map((p) => ({
      id: p.id,
      roles: p.roles,
      link: p.link?.webUrl,
      linkType: p.link?.type,
      grantedTo: p.grantedTo?.user?.displayName || p.grantedToV2?.user?.displayName,
    })),
  };
}

async function opDeletePermission(config, ctx) {
  const { headers } = ctx;
  const { path, permissionId } = config;
  if (!path) return { success: false, error: "OneDrive deletePermission: 'path' or item ID is required.", skipped: true };
  if (!permissionId) return { success: false, error: "OneDrive deletePermission: 'permissionId' is required.", skipped: true };
  await axios.delete(`${itemUrl(path)}/permissions/${permissionId}`, { headers, timeout: 15000 });
  return { success: true, deleted: true, permissionId };
}

async function opInvite(config, ctx) {
  const { headers } = ctx;
  const { path, recipients } = config;
  if (!path) return { success: false, error: "OneDrive invite: 'path' or item ID is required.", skipped: true };
  if (!recipients) return { success: false, error: "OneDrive invite: 'recipients' (comma-separated emails) is required.", skipped: true };
  const emails = String(recipients).split(",").map((e) => e.trim()).filter(Boolean);
  const body = {
    recipients: emails.map((email) => ({ email })),
    roles: [config.role === "write" ? "write" : "read"],
    requireSignIn: config.requireSignIn !== false,
    sendInvitation: config.sendInvitation !== false,
    message: config.message || "",
  };
  const res = await axios.post(`${itemUrl(path)}/invite`, body, { headers, timeout: 15000 });
  return { success: true, invited: emails, count: res.data.value?.length ?? emails.length };
}

export const sharingOperations = {
  shareFile: opShareFile,
  listPermissions: opListPermissions,
  deletePermission: opDeletePermission,
  invite: opInvite,
};
