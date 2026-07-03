/**
 * ClickUp — remaining resources: Checklist, Goal, TimeTracking, Tag,
 * CustomField, Team/Member, and List-level comments.
 */
import { req, parseDueDate, csvNumbers } from "../GenericFunctions.js";

/* ---- List Comments ---- */
async function opGetListComments(config, client) {
  const data = await req(client, "GET", `/list/${config.listId}/comment`);
  return { success: true, comments: data.comments || [] };
}

async function opCreateListComment(config, client) {
  const body = { comment_text: config.commentText };
  if (config.assignee) body.assignee = Number(config.assignee);
  if (config.notifyAll != null) body.notify_all = config.notifyAll;
  const data = await req(client, "POST", `/list/${config.listId}/comment`, { body });
  return { success: true, comment: data };
}

async function opUpdateComment(config, client) {
  const body = {};
  if (config.commentText != null) body.comment_text = config.commentText;
  if (config.assignee) body.assignee = Number(config.assignee);
  if (config.resolved != null) body.resolved = config.resolved;
  await req(client, "PUT", `/comment/${config.commentId}`, { body });
  return { success: true, updated: true, commentId: config.commentId };
}

async function opDeleteComment(config, client) {
  await req(client, "DELETE", `/comment/${config.commentId}`);
  return { success: true, deleted: true, commentId: config.commentId };
}

/* ---- Checklist ---- */
async function opCreateChecklist(config, client) {
  const data = await req(client, "POST", `/task/${config.taskId}/checklist`, { body: { name: config.name } });
  return { success: true, checklist: data.checklist ?? data };
}

async function opUpdateChecklist(config, client) {
  const body = {};
  if (config.name != null) body.name = config.name;
  if (config.position != null && config.position !== "") body.position = Number(config.position);
  await req(client, "PUT", `/checklist/${config.checklistId}`, { body });
  return { success: true, updated: true, checklistId: config.checklistId };
}

async function opDeleteChecklist(config, client) {
  await req(client, "DELETE", `/checklist/${config.checklistId}`);
  return { success: true, deleted: true, checklistId: config.checklistId };
}

async function opCreateChecklistItem(config, client) {
  const body = { name: config.name };
  if (config.assignee) body.assignee = Number(config.assignee);
  const data = await req(client, "POST", `/checklist/${config.checklistId}/checklist_item`, { body });
  return { success: true, checklist: data.checklist ?? data };
}

async function opUpdateChecklistItem(config, client) {
  const body = {};
  if (config.name != null) body.name = config.name;
  if (config.resolved != null) body.resolved = config.resolved;
  if (config.assignee) body.assignee = Number(config.assignee);
  if (config.parent) body.parent = config.parent;
  const data = await req(client, "PUT", `/checklist/${config.checklistId}/checklist_item/${config.checklistItemId}`, { body });
  return { success: true, checklist: data.checklist ?? data };
}

async function opDeleteChecklistItem(config, client) {
  await req(client, "DELETE", `/checklist/${config.checklistId}/checklist_item/${config.checklistItemId}`);
  return { success: true, deleted: true, checklistItemId: config.checklistItemId };
}

/* ---- Goal ---- */
async function opListGoals(config, client) {
  const params = {};
  if (config.includeCompleted != null) params.include_completed = config.includeCompleted;
  const data = await req(client, "GET", `/team/${config.teamId}/goal`, { params });
  return { success: true, goals: data.goals || [], folders: data.folders || [] };
}

async function opGetGoal(config, client) {
  const data = await req(client, "GET", `/goal/${config.goalId}`);
  return { success: true, goal: data.goal ?? data };
}

async function opCreateGoal(config, client) {
  const body = { name: config.name };
  const due = parseDueDate(config.dueDate);
  if (due !== undefined) body.due_date = due;
  if (config.description != null) body.description = config.description;
  if (config.multipleOwners != null) body.multiple_owners = config.multipleOwners;
  const owners = csvNumbers(config.owners);
  if (owners.length) body.owners = owners;
  if (config.color) body.color = config.color;
  const data = await req(client, "POST", `/team/${config.teamId}/goal`, { body });
  return { success: true, goal: data.goal ?? data };
}

async function opUpdateGoal(config, client) {
  const body = {};
  if (config.name != null) body.name = config.name;
  const due = parseDueDate(config.dueDate);
  if (due !== undefined) body.due_date = due;
  if (config.description != null) body.description = config.description;
  if (config.color) body.color = config.color;
  const addOwners = csvNumbers(config.addOwners);
  if (addOwners.length) body.add_owners = addOwners;
  const remOwners = csvNumbers(config.removeOwners);
  if (remOwners.length) body.rem_owners = remOwners;
  const data = await req(client, "PUT", `/goal/${config.goalId}`, { body });
  return { success: true, goal: data.goal ?? data };
}

async function opDeleteGoal(config, client) {
  await req(client, "DELETE", `/goal/${config.goalId}`);
  return { success: true, deleted: true, goalId: config.goalId };
}

/* ---- Time Tracking ---- */
async function opListTimeEntries(config, client) {
  const params = {};
  if (config.startDate) { const s = parseDueDate(config.startDate); if (s !== undefined) params.start_date = s; }
  if (config.endDate) { const e = parseDueDate(config.endDate); if (e !== undefined) params.end_date = e; }
  if (config.assignee) params.assignee = config.assignee;
  const data = await req(client, "GET", `/team/${config.teamId}/time_entries`, { params });
  return { success: true, timeEntries: data.data || [] };
}

async function opGetTimeEntry(config, client) {
  const data = await req(client, "GET", `/team/${config.teamId}/time_entries/${config.timerId}`);
  return { success: true, timeEntry: data.data ?? data };
}

async function opCreateTimeEntry(config, client) {
  const body = {};
  const start = parseDueDate(config.startDate);
  if (start !== undefined) body.start = start;
  if (config.duration != null && config.duration !== "") body.duration = Number(config.duration);
  if (config.taskId) body.tid = config.taskId;
  if (config.description != null) body.description = config.description;
  if (config.billable != null) body.billable = config.billable;
  const data = await req(client, "POST", `/team/${config.teamId}/time_entries`, { body });
  return { success: true, timeEntry: data.data ?? data };
}

async function opUpdateTimeEntry(config, client) {
  const body = {};
  if (config.description != null) body.description = config.description;
  if (config.duration != null && config.duration !== "") body.duration = Number(config.duration);
  if (config.billable != null) body.billable = config.billable;
  if (config.taskId) body.tid = config.taskId;
  const data = await req(client, "PUT", `/team/${config.teamId}/time_entries/${config.timerId}`, { body });
  return { success: true, timeEntry: data.data ?? data };
}

async function opDeleteTimeEntry(config, client) {
  await req(client, "DELETE", `/team/${config.teamId}/time_entries/${config.timerId}`);
  return { success: true, deleted: true, timerId: config.timerId };
}

async function opStartTimeEntry(config, client) {
  const body = {};
  if (config.taskId) body.tid = config.taskId;
  if (config.description != null) body.description = config.description;
  if (config.billable != null) body.billable = config.billable;
  const data = await req(client, "POST", `/team/${config.teamId}/time_entries/start`, { body });
  return { success: true, timeEntry: data.data ?? data };
}

async function opStopTimeEntry(config, client) {
  const data = await req(client, "POST", `/team/${config.teamId}/time_entries/stop`);
  return { success: true, timeEntry: data.data ?? data };
}

/* ---- Tag ---- */
async function opListSpaceTags(config, client) {
  const data = await req(client, "GET", `/space/${config.spaceId}/tag`);
  return { success: true, tags: data.tags || [] };
}

async function opCreateSpaceTag(config, client) {
  const tag = { name: config.tagName };
  if (config.tagFg) tag.tag_fg = config.tagFg;
  if (config.tagBg) tag.tag_bg = config.tagBg;
  await req(client, "POST", `/space/${config.spaceId}/tag`, { body: { tag } });
  return { success: true, created: true, tag: config.tagName };
}

async function opUpdateSpaceTag(config, client) {
  const tag = { name: config.newTagName || config.tagName };
  if (config.tagFg) tag.tag_fg = config.tagFg;
  if (config.tagBg) tag.tag_bg = config.tagBg;
  await req(client, "PUT", `/space/${config.spaceId}/tag/${encodeURIComponent(config.tagName)}`, { body: { tag } });
  return { success: true, updated: true, tag: config.tagName };
}

async function opDeleteSpaceTag(config, client) {
  await req(client, "DELETE", `/space/${config.spaceId}/tag/${encodeURIComponent(config.tagName)}`, { body: { tag: { name: config.tagName } } });
  return { success: true, deleted: true, tag: config.tagName };
}

/* ---- Custom Field ---- */
async function opListCustomFields(config, client) {
  const data = await req(client, "GET", `/list/${config.listId}/field`);
  return { success: true, fields: data.fields || [] };
}

/* ---- Team / Member ---- */
async function opListTeams(config, client) {
  const data = await req(client, "GET", `/team`);
  return { success: true, teams: data.teams || [] };
}

async function opListMembers(config, client) {
  const data = await req(client, "GET", `/list/${config.listId}/member`);
  return { success: true, members: data.members || [] };
}

async function opListTaskMembers(config, client) {
  const data = await req(client, "GET", `/task/${config.taskId}/member`);
  return { success: true, members: data.members || [] };
}

export const miscOperations = {
  getListComments: opGetListComments,
  createListComment: opCreateListComment,
  updateComment: opUpdateComment,
  deleteComment: opDeleteComment,
  createChecklist: opCreateChecklist,
  updateChecklist: opUpdateChecklist,
  deleteChecklist: opDeleteChecklist,
  createChecklistItem: opCreateChecklistItem,
  updateChecklistItem: opUpdateChecklistItem,
  deleteChecklistItem: opDeleteChecklistItem,
  listGoals: opListGoals,
  getGoal: opGetGoal,
  createGoal: opCreateGoal,
  updateGoal: opUpdateGoal,
  deleteGoal: opDeleteGoal,
  listTimeEntries: opListTimeEntries,
  getTimeEntry: opGetTimeEntry,
  createTimeEntry: opCreateTimeEntry,
  updateTimeEntry: opUpdateTimeEntry,
  deleteTimeEntry: opDeleteTimeEntry,
  startTimeEntry: opStartTimeEntry,
  stopTimeEntry: opStopTimeEntry,
  listSpaceTags: opListSpaceTags,
  createSpaceTag: opCreateSpaceTag,
  updateSpaceTag: opUpdateSpaceTag,
  deleteSpaceTag: opDeleteSpaceTag,
  listCustomFields: opListCustomFields,
  listTeams: opListTeams,
  listMembers: opListMembers,
  listTaskMembers: opListTaskMembers,
};
