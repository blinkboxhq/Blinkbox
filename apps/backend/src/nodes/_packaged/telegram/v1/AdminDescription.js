/**
 * Telegram — group administration: members, restrictions, invites, chat info.
 * Handlers receive `(config, token)`.
 */
import { call, requireChat } from "../GenericFunctions.js";

async function opSetChatTitle(config, token) {
  const { chatId, _err } = requireChat(config, "setChatTitle");
  if (_err) return _err;
  if (!config.title) return { success: false, error: "Telegram setChatTitle: 'title' is required.", skipped: true };
  const data = await call(token, "setChatTitle", { chat_id: chatId, title: config.title });
  return { ok: data.ok, updated: data.result === true };
}

async function opSetChatDescription(config, token) {
  const { chatId, _err } = requireChat(config, "setChatDescription");
  if (_err) return _err;
  const data = await call(token, "setChatDescription", { chat_id: chatId, description: config.description || "" });
  return { ok: data.ok, updated: data.result === true };
}

async function opLeaveChat(config, token) {
  const { chatId, _err } = requireChat(config, "leaveChat");
  if (_err) return _err;
  const data = await call(token, "leaveChat", { chat_id: chatId });
  return { ok: data.ok, left: data.result === true };
}

async function opBanChatMember(config, token) {
  const { chatId, _err } = requireChat(config, "banChatMember");
  if (_err) return _err;
  if (!config.userId) return { success: false, error: "Telegram banChatMember: 'userId' is required.", skipped: true };
  const payload = { chat_id: chatId, user_id: config.userId };
  if (config.untilDate) payload.until_date = Number(config.untilDate);
  if (config.revokeMessages) payload.revoke_messages = true;
  const data = await call(token, "banChatMember", payload);
  return { ok: data.ok, banned: data.result === true };
}

async function opUnbanChatMember(config, token) {
  const { chatId, _err } = requireChat(config, "unbanChatMember");
  if (_err) return _err;
  if (!config.userId) return { success: false, error: "Telegram unbanChatMember: 'userId' is required.", skipped: true };
  const data = await call(token, "unbanChatMember", { chat_id: chatId, user_id: config.userId, only_if_banned: config.onlyIfBanned !== false });
  return { ok: data.ok, unbanned: data.result === true };
}

async function opRestrictChatMember(config, token) {
  const { chatId, _err } = requireChat(config, "restrictChatMember");
  if (_err) return _err;
  if (!config.userId) return { success: false, error: "Telegram restrictChatMember: 'userId' is required.", skipped: true };
  const permissions = {
    can_send_messages: config.canSendMessages || false,
    can_send_media_messages: config.canSendMedia || false,
    can_send_polls: config.canSendPolls || false,
    can_send_other_messages: config.canSendOther || false,
    can_add_web_page_previews: config.canAddPreviews || false,
  };
  const payload = { chat_id: chatId, user_id: config.userId, permissions };
  if (config.untilDate) payload.until_date = Number(config.untilDate);
  const data = await call(token, "restrictChatMember", payload);
  return { ok: data.ok, restricted: data.result === true };
}

async function opPromoteChatMember(config, token) {
  const { chatId, _err } = requireChat(config, "promoteChatMember");
  if (_err) return _err;
  if (!config.userId) return { success: false, error: "Telegram promoteChatMember: 'userId' is required.", skipped: true };
  const data = await call(token, "promoteChatMember", {
    chat_id: chatId,
    user_id: config.userId,
    can_manage_chat: config.canManageChat || false,
    can_delete_messages: config.canDeleteMessages || false,
    can_restrict_members: config.canRestrictMembers || false,
    can_promote_members: config.canPromoteMembers || false,
    can_change_info: config.canChangeInfo || false,
    can_invite_users: config.canInviteUsers || false,
    can_pin_messages: config.canPinMessages || false,
  });
  return { ok: data.ok, promoted: data.result === true };
}

async function opCreateInviteLink(config, token) {
  const { chatId, _err } = requireChat(config, "createInviteLink");
  if (_err) return _err;
  const payload = { chat_id: chatId };
  if (config.inviteName) payload.name = config.inviteName;
  if (config.expireDate) payload.expire_date = Number(config.expireDate);
  if (config.memberLimit) payload.member_limit = Number(config.memberLimit);
  if (config.createsJoinRequest) payload.creates_join_request = true;
  const data = await call(token, "createChatInviteLink", payload);
  return { ok: data.ok, inviteLink: data.result?.invite_link, name: data.result?.name, expireDate: data.result?.expire_date };
}

async function opRevokeInviteLink(config, token) {
  const { chatId, _err } = requireChat(config, "revokeInviteLink");
  if (_err) return _err;
  if (!config.inviteLink) return { success: false, error: "Telegram revokeInviteLink: 'inviteLink' is required.", skipped: true };
  const data = await call(token, "revokeChatInviteLink", { chat_id: chatId, invite_link: config.inviteLink });
  return { ok: data.ok, inviteLink: data.result?.invite_link, revoked: data.result?.is_revoked };
}

async function opExportInviteLink(config, token) {
  const { chatId, _err } = requireChat(config, "exportInviteLink");
  if (_err) return _err;
  const data = await call(token, "exportChatInviteLink", { chat_id: chatId });
  return { ok: data.ok, inviteLink: data.result };
}

export const adminOperations = {
  setChatTitle: opSetChatTitle,
  setChatDescription: opSetChatDescription,
  leaveChat: opLeaveChat,
  banChatMember: opBanChatMember,
  unbanChatMember: opUnbanChatMember,
  restrictChatMember: opRestrictChatMember,
  promoteChatMember: opPromoteChatMember,
  createInviteLink: opCreateInviteLink,
  revokeInviteLink: opRevokeInviteLink,
  exportInviteLink: opExportInviteLink,
};
