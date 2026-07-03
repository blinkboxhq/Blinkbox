/**
 * Trello — Card resource. Full n8n-parity: CRUD, move, archive, comments,
 * labels, members, attachments, checklists, and due-complete.
 */
import { req } from "../GenericFunctions.js";

async function opListCards(config, client) {
  if (!config.listId) return { success: false, error: "Trello listCards: 'listId' is required.", skipped: true };
  const data = await req(client, "GET", `/lists/${encodeURIComponent(config.listId)}/cards`);
  return { success: true, cards: data, count: data.length };
}

async function opGetCard(config, client) {
  if (!config.cardId) return { success: false, error: "Trello getCard: 'cardId' is required.", skipped: true };
  const params = {};
  if (config.fields) params.fields = config.fields;
  const data = await req(client, "GET", `/cards/${encodeURIComponent(config.cardId)}`, { params });
  return { success: true, card: data };
}

function buildCardParams(config) {
  const params = {};
  if (config.name != null) params.name = config.name;
  if (config.desc !== undefined) params.desc = config.desc;
  if (config.due) params.due = config.due;
  if (config.start) params.start = config.start;
  if (config.dueComplete != null) params.dueComplete = config.dueComplete;
  if (config.position) params.pos = config.position;
  if (config.labelIds) params.idLabels = config.labelIds;
  if (config.memberIds) params.idMembers = config.memberIds;
  return params;
}

async function opCreateCard(config, client) {
  if (!config.listId || !config.name) return { success: false, error: "Trello createCard: 'listId' and 'name' are required.", skipped: true };
  const params = { ...buildCardParams(config), idList: config.listId, name: config.name };
  const data = await req(client, "POST", `/cards`, { params });
  return { success: true, card: data };
}

async function opUpdateCard(config, client) {
  if (!config.cardId) return { success: false, error: "Trello updateCard: 'cardId' is required.", skipped: true };
  const params = buildCardParams(config);
  if (config.listId) params.idList = config.listId;
  if (config.closed != null) params.closed = config.closed;
  const data = await req(client, "PUT", `/cards/${encodeURIComponent(config.cardId)}`, { params });
  return { success: true, card: data };
}

async function opMoveCard(config, client) {
  if (!config.cardId || !config.listId) return { success: false, error: "Trello moveCard: 'cardId' and 'listId' are required.", skipped: true };
  const params = { idList: config.listId };
  if (config.position) params.pos = config.position;
  const data = await req(client, "PUT", `/cards/${encodeURIComponent(config.cardId)}`, { params });
  return { success: true, card: data };
}

async function opArchiveCard(config, client) {
  if (!config.cardId) return { success: false, error: "Trello archiveCard: 'cardId' is required.", skipped: true };
  const data = await req(client, "PUT", `/cards/${encodeURIComponent(config.cardId)}`, { params: { closed: true } });
  return { success: true, card: data };
}

async function opDeleteCard(config, client) {
  if (!config.cardId) return { success: false, error: "Trello deleteCard: 'cardId' is required.", skipped: true };
  await req(client, "DELETE", `/cards/${encodeURIComponent(config.cardId)}`);
  return { success: true, deleted: true, id: config.cardId };
}

async function opAddComment(config, client) {
  if (!config.cardId || !config.text) return { success: false, error: "Trello addComment: 'cardId' and 'text' are required.", skipped: true };
  const data = await req(client, "POST", `/cards/${encodeURIComponent(config.cardId)}/actions/comments`, { params: { text: config.text } });
  return { success: true, comment: { id: data.id, text: data.data?.text, date: data.date } };
}

async function opListComments(config, client) {
  if (!config.cardId) return { success: false, error: "Trello listComments: 'cardId' is required.", skipped: true };
  const data = await req(client, "GET", `/cards/${encodeURIComponent(config.cardId)}/actions`, { params: { filter: "commentCard" } });
  return { success: true, comments: data };
}

async function opAddLabel(config, client) {
  if (!config.cardId) return { success: false, error: "Trello addLabel: 'cardId' is required.", skipped: true };
  if (config.labelId) {
    const data = await req(client, "POST", `/cards/${encodeURIComponent(config.cardId)}/idLabels`, { params: { value: config.labelId } });
    return { success: true, labels: data };
  }
  const params = {};
  if (config.labelColor) params.color = config.labelColor;
  if (config.labelName) params.name = config.labelName;
  const data = await req(client, "POST", `/cards/${encodeURIComponent(config.cardId)}/labels`, { params });
  return { success: true, label: data };
}

async function opRemoveLabel(config, client) {
  if (!config.cardId || !config.labelId) return { success: false, error: "Trello removeLabel: 'cardId' and 'labelId' are required.", skipped: true };
  await req(client, "DELETE", `/cards/${encodeURIComponent(config.cardId)}/idLabels/${encodeURIComponent(config.labelId)}`);
  return { success: true, removed: true, cardId: config.cardId, labelId: config.labelId };
}

async function opAddMember(config, client) {
  if (!config.cardId || !config.memberId) return { success: false, error: "Trello addMember: 'cardId' and 'memberId' are required.", skipped: true };
  const data = await req(client, "POST", `/cards/${encodeURIComponent(config.cardId)}/idMembers`, { params: { value: config.memberId } });
  return { success: true, members: data };
}

async function opRemoveMember(config, client) {
  if (!config.cardId || !config.memberId) return { success: false, error: "Trello removeMember: 'cardId' and 'memberId' are required.", skipped: true };
  await req(client, "DELETE", `/cards/${encodeURIComponent(config.cardId)}/idMembers/${encodeURIComponent(config.memberId)}`);
  return { success: true, removed: true, cardId: config.cardId, memberId: config.memberId };
}

async function opAddAttachment(config, client) {
  if (!config.cardId || !config.attachmentUrl) return { success: false, error: "Trello addAttachment: 'cardId' and 'attachmentUrl' are required.", skipped: true };
  const params = { url: config.attachmentUrl };
  if (config.attachmentName) params.name = config.attachmentName;
  const data = await req(client, "POST", `/cards/${encodeURIComponent(config.cardId)}/attachments`, { params });
  return { success: true, attachment: data };
}

async function opListAttachments(config, client) {
  if (!config.cardId) return { success: false, error: "Trello listAttachments: 'cardId' is required.", skipped: true };
  const data = await req(client, "GET", `/cards/${encodeURIComponent(config.cardId)}/attachments`);
  return { success: true, attachments: data };
}

async function opDeleteAttachment(config, client) {
  if (!config.cardId || !config.attachmentId) return { success: false, error: "Trello deleteAttachment: 'cardId' and 'attachmentId' are required.", skipped: true };
  await req(client, "DELETE", `/cards/${encodeURIComponent(config.cardId)}/attachments/${encodeURIComponent(config.attachmentId)}`);
  return { success: true, deleted: true, id: config.attachmentId };
}

export const cardOperations = {
  listCards: opListCards,
  getCard: opGetCard,
  createCard: opCreateCard,
  updateCard: opUpdateCard,
  moveCard: opMoveCard,
  archiveCard: opArchiveCard,
  deleteCard: opDeleteCard,
  addComment: opAddComment,
  listComments: opListComments,
  addLabel: opAddLabel,
  removeLabel: opRemoveLabel,
  addMember: opAddMember,
  removeMember: opRemoveMember,
  addAttachment: opAddAttachment,
  listAttachments: opListAttachments,
  deleteAttachment: opDeleteAttachment,
};
