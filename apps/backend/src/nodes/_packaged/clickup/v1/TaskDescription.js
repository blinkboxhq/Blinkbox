/**
 * ClickUp — Task resource. Full n8n-parity action set: CRUD, comments,
 * assignees, tags, dependencies, custom-field values.
 */
import { req, parseDueDate, csvNumbers, csvStrings } from "../GenericFunctions.js";

async function opListTasks(config, client) {
  const params = {};
  if (config.archived != null) params.archived = config.archived;
  if (config.page != null) params.page = config.page;
  if (config.orderBy) params.order_by = config.orderBy;
  if (config.reverse != null) params.reverse = config.reverse;
  if (config.subtasks != null) params.subtasks = config.subtasks;
  if (config.includeClosed != null) params.include_closed = config.includeClosed;
  const statuses = csvStrings(config.statuses);
  if (statuses.length) params["statuses[]"] = statuses;
  const assignees = csvNumbers(config.assignees);
  if (assignees.length) params["assignees[]"] = assignees;
  const data = await req(client, "GET", `/list/${config.listId}/task`, { params });
  return { success: true, tasks: data.tasks || [], count: (data.tasks || []).length };
}

async function opGetTask(config, client) {
  const params = {};
  if (config.customTaskIds != null) params.custom_task_ids = config.customTaskIds;
  if (config.teamId) params.team_id = config.teamId;
  if (config.includeSubtasks != null) params.include_subtasks = config.includeSubtasks;
  const data = await req(client, "GET", `/task/${config.taskId}`, { params });
  return { success: true, task: data };
}

function buildTaskBody(config) {
  const body = {};
  if (config.name != null) body.name = config.name;
  if (config.description != null) body.description = config.description;
  if (config.markdownDescription != null) body.markdown_content = config.markdownDescription;
  if (config.status) body.status = config.status;
  if (config.priority != null && config.priority !== "") body.priority = Number(config.priority);
  const due = parseDueDate(config.dueDate);
  if (due !== undefined) body.due_date = due;
  if (config.dueDateTime != null) body.due_date_time = config.dueDateTime;
  const start = parseDueDate(config.startDate);
  if (start !== undefined) body.start_date = start;
  if (config.startDateTime != null) body.start_date_time = config.startDateTime;
  if (config.timeEstimate != null && config.timeEstimate !== "") body.time_estimate = Number(config.timeEstimate);
  if (config.notifyAll != null) body.notify_all = config.notifyAll;
  if (config.parent) body.parent = config.parent;
  const assignees = csvNumbers(config.assignees);
  if (assignees.length) body.assignees = assignees;
  const tags = csvStrings(config.tags);
  if (tags.length) body.tags = tags;
  return body;
}

async function opCreateTask(config, client) {
  const body = buildTaskBody(config);
  if (!body.name) throw new Error("ClickUp: Task name is required.");
  const data = await req(client, "POST", `/list/${config.listId}/task`, { body });
  return { success: true, task: data };
}

async function opUpdateTask(config, client) {
  const body = buildTaskBody(config);
  if (config.assignees != null && String(config.assignees).trim() !== "") {
    const add = csvNumbers(config.assignees);
    const rem = csvNumbers(config.removeAssignees);
    body.assignees = { add, rem };
  }
  const data = await req(client, "PUT", `/task/${config.taskId}`, { body });
  return { success: true, task: data };
}

async function opDeleteTask(config, client) {
  await req(client, "DELETE", `/task/${config.taskId}`);
  return { success: true, deleted: true, taskId: config.taskId };
}

async function opGetTaskComments(config, client) {
  const data = await req(client, "GET", `/task/${config.taskId}/comment`);
  return { success: true, comments: data.comments || [] };
}

async function opAddComment(config, client) {
  const body = { comment_text: config.commentText };
  if (config.assignee) body.assignee = Number(config.assignee);
  if (config.notifyAll != null) body.notify_all = config.notifyAll;
  const data = await req(client, "POST", `/task/${config.taskId}/comment`, { body });
  return { success: true, comment: data };
}

async function opAddAssignee(config, client) {
  const add = csvNumbers(config.assignees);
  const data = await req(client, "PUT", `/task/${config.taskId}`, { body: { assignees: { add, rem: [] } } });
  return { success: true, task: data };
}

async function opRemoveAssignee(config, client) {
  const rem = csvNumbers(config.assignees);
  const data = await req(client, "PUT", `/task/${config.taskId}`, { body: { assignees: { add: [], rem } } });
  return { success: true, task: data };
}

async function opAddTag(config, client) {
  await req(client, "POST", `/task/${config.taskId}/tag/${encodeURIComponent(config.tagName)}`);
  return { success: true, added: true, taskId: config.taskId, tag: config.tagName };
}

async function opRemoveTag(config, client) {
  await req(client, "DELETE", `/task/${config.taskId}/tag/${encodeURIComponent(config.tagName)}`);
  return { success: true, removed: true, taskId: config.taskId, tag: config.tagName };
}

async function opAddDependency(config, client) {
  const body = {};
  if (config.dependsOn) body.depends_on = config.dependsOn;
  if (config.dependencyOf) body.dependency_of = config.dependencyOf;
  await req(client, "POST", `/task/${config.taskId}/dependency`, { body });
  return { success: true, added: true, taskId: config.taskId };
}

async function opDeleteDependency(config, client) {
  const params = {};
  if (config.dependsOn) params.depends_on = config.dependsOn;
  if (config.dependencyOf) params.dependency_of = config.dependencyOf;
  await req(client, "DELETE", `/task/${config.taskId}/dependency`, { params });
  return { success: true, deleted: true, taskId: config.taskId };
}

async function opSetCustomFieldValue(config, client) {
  let value = config.fieldValue;
  try { value = JSON.parse(config.fieldValue); } catch { /* keep raw */ }
  await req(client, "POST", `/task/${config.taskId}/field/${config.fieldId}`, { body: { value } });
  return { success: true, set: true, taskId: config.taskId, fieldId: config.fieldId };
}

async function opRemoveCustomFieldValue(config, client) {
  await req(client, "DELETE", `/task/${config.taskId}/field/${config.fieldId}`);
  return { success: true, removed: true, taskId: config.taskId, fieldId: config.fieldId };
}

export const taskOperations = {
  listTasks: opListTasks,
  getTask: opGetTask,
  createTask: opCreateTask,
  updateTask: opUpdateTask,
  deleteTask: opDeleteTask,
  getTaskComments: opGetTaskComments,
  addComment: opAddComment,
  addAssignee: opAddAssignee,
  removeAssignee: opRemoveAssignee,
  addTag: opAddTag,
  removeTag: opRemoveTag,
  addDependency: opAddDependency,
  deleteDependency: opDeleteDependency,
  setCustomFieldValue: opSetCustomFieldValue,
  removeCustomFieldValue: opRemoveCustomFieldValue,
};
