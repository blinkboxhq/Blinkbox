/**
 * OUTLOOK — Mail folder & draft resource. All parity additions over the
 * monolith (which had no folder/draft ops): listFolders, createFolder,
 * deleteFolder, createDraft. Handlers receive (config, client).
 */
import { buildRecipients, messageBody, num } from "../GenericFunctions.js";

async function opListFolders(config, client) {
  const params = { $top: num(config.limit, 50) };
  const res = await client.get(`/me/mailFolders`, params);
  return {
    success: true,
    count: res.data.value.length,
    folders: res.data.value.map((f) => ({
      id: f.id,
      displayName: f.displayName,
      unreadItemCount: f.unreadItemCount,
      totalItemCount: f.totalItemCount,
    })),
  };
}

async function opCreateFolder(config, client) {
  const { displayName } = config;
  if (!displayName) return { success: false, error: "Outlook createFolder: 'displayName' is required.", skipped: true };
  const body = { displayName };
  const res = config.parentFolderId
    ? await client.post(`/me/mailFolders/${client.enc(config.parentFolderId)}/childFolders`, body)
    : await client.post(`/me/mailFolders`, body);
  return { success: true, id: res.data.id, displayName: res.data.displayName };
}

async function opDeleteFolder(config, client) {
  const { folderId } = config;
  if (!folderId) return { success: false, error: "Outlook deleteFolder: 'folderId' is required.", skipped: true };
  await client.del(`/me/mailFolders/${client.enc(folderId)}`);
  return { success: true, deleted: true, folderId };
}

async function opCreateDraft(config, client) {
  const { to, subject, body, isHtml } = config;
  if (!subject) return { success: false, error: "Outlook createDraft: 'subject' is required.", skipped: true };
  const draft = { subject, body: messageBody(body, isHtml) };
  if (to) draft.toRecipients = buildRecipients(to);
  if (config.cc) draft.ccRecipients = buildRecipients(config.cc);
  const res = await client.post(`/me/messages`, draft);
  return { success: true, id: res.data.id, subject: res.data.subject, webLink: res.data.webLink };
}

export const folderOperations = {
  listFolders: opListFolders,
  createFolder: opCreateFolder,
  deleteFolder: opDeleteFolder,
  createDraft: opCreateDraft,
};
