/**
 * Asana — Task & Subtask resources. Full n8n-parity: CRUD, complete, search,
 * comments (stories), project membership, tags, dependencies, followers,
 * and subtasks.
 */
import { req, csvGids, TASK_FIELDS } from "../GenericFunctions.js";

async function opListTasks(config, client) {
  if (!config.projectGid && !config.assignee && !config.workspaceGid)
    return { success: false, error: "Asana listTasks: 'projectGid' (or assignee+workspace) is required.", skipped: true };
  const params = { opt_fields: config.optFields || TASK_FIELDS, limit: Math.min(Number(config.limit) || 50, 100) };
  if (config.projectGid) params.project = config.projectGid;
  if (config.assignee) params.assignee = config.assignee;
  if (config.workspaceGid) params.workspace = config.workspaceGid;
  if (config.completedSince) params.completed_since = config.completedSince;
  if (config.modifiedSince) params.modified_since = config.modifiedSince;
  const data = await req(client, "GET", `/tasks`, { params });
  return { success: true, tasks: data ?? [], count: data?.length ?? 0 };
}

async function opGetTask(config, client) {
  if (!config.taskGid) return { success: false, error: "Asana getTask: 'taskGid' is required.", skipped: true };
  const data = await req(client, "GET", `/tasks/${encodeURIComponent(config.taskGid)}`, { params: { opt_fields: config.optFields || TASK_FIELDS } });
  return { success: true, task: data };
}

function buildTaskData(config) {
  const d = {};
  if (config.name != null) d.name = config.name;
  if (config.notes !== undefined) d.notes = config.notes;
  if (config.htmlNotes !== undefined) d.html_notes = config.htmlNotes;
  if (config.dueOn) d.due_on = config.dueOn;
  if (config.dueAt) d.due_at = config.dueAt;
  if (config.startOn) d.start_on = config.startOn;
  if (config.assignee) d.assignee = config.assignee;
  if (config.completed != null) d.completed = config.completed;
  if (config.approvalStatus) d.approval_status = config.approvalStatus;
  const followers = csvGids(config.followers);
  if (followers.length) d.followers = followers;
  return d;
}

async function opCreateTask(config, client) {
  if (!config.name) return { success: false, error: "Asana createTask: 'name' is required.", skipped: true };
  const d = buildTaskData(config);
  const projects = csvGids(config.projectGid);
  if (projects.length) d.projects = projects;
  if (config.workspaceGid && !projects.length && !config.parent) d.workspace = config.workspaceGid;
  if (config.parent) d.parent = config.parent;
  const data = await req(client, "POST", `/tasks`, { body: { data: d } });
  return { success: true, task: data };
}

async function opUpdateTask(config, client) {
  if (!config.taskGid) return { success: false, error: "Asana updateTask: 'taskGid' is required.", skipped: true };
  const data = await req(client, "PUT", `/tasks/${encodeURIComponent(config.taskGid)}`, { body: { data: buildTaskData(config) } });
  return { success: true, task: data };
}

async function opCompleteTask(config, client) {
  if (!config.taskGid) return { success: false, error: "Asana completeTask: 'taskGid' is required.", skipped: true };
  const completed = config.completed != null ? config.completed : true;
  const data = await req(client, "PUT", `/tasks/${encodeURIComponent(config.taskGid)}`, { body: { data: { completed } } });
  return { success: true, task: data };
}

async function opDeleteTask(config, client) {
  if (!config.taskGid) return { success: false, error: "Asana deleteTask: 'taskGid' is required.", skipped: true };
  await req(client, "DELETE", `/tasks/${encodeURIComponent(config.taskGid)}`);
  return { success: true, deleted: true, gid: config.taskGid };
}

async function opSearchTasks(config, client) {
  if (!config.workspaceGid) return { success: false, error: "Asana searchTasks: 'workspaceGid' is required.", skipped: true };
  const params = { opt_fields: config.optFields || TASK_FIELDS, limit: Math.min(Number(config.limit) || 50, 100) };
  if (config.text) params.text = config.text;
  if (config.completed != null) params["completed"] = config.completed;
  if (config.assignee) params["assignee.any"] = config.assignee;
  if (config.projectGid) params["projects.any"] = config.projectGid;
  const data = await req(client, "GET", `/workspaces/${encodeURIComponent(config.workspaceGid)}/tasks/search`, { params });
  return { success: true, tasks: data ?? [], count: data?.length ?? 0 };
}

async function opAddComment(config, client) {
  if (!config.taskGid || !config.text) return { success: false, error: "Asana addComment: 'taskGid' and 'text' are required.", skipped: true };
  const body = { data: config.isHtml ? { html_text: config.text } : { text: config.text } };
  const data = await req(client, "POST", `/tasks/${encodeURIComponent(config.taskGid)}/stories`, { body });
  return { success: true, story: data };
}

async function opListComments(config, client) {
  if (!config.taskGid) return { success: false, error: "Asana listComments: 'taskGid' is required.", skipped: true };
  const data = await req(client, "GET", `/tasks/${encodeURIComponent(config.taskGid)}/stories`, { params: { opt_fields: "gid,text,html_text,created_at,created_by.name,type,resource_subtype" } });
  return { success: true, stories: data ?? [] };
}

async function opAddToProject(config, client) {
  if (!config.taskGid || !config.projectGid) return { success: false, error: "Asana addToProject: 'taskGid' and 'projectGid' are required.", skipped: true };
  const d = { project: config.projectGid };
  if (config.sectionGid) d.section = config.sectionGid;
  await req(client, "POST", `/tasks/${encodeURIComponent(config.taskGid)}/addProject`, { body: { data: d } });
  return { success: true, added: true, taskGid: config.taskGid, projectGid: config.projectGid };
}

async function opRemoveFromProject(config, client) {
  if (!config.taskGid || !config.projectGid) return { success: false, error: "Asana removeFromProject: 'taskGid' and 'projectGid' are required.", skipped: true };
  await req(client, "POST", `/tasks/${encodeURIComponent(config.taskGid)}/removeProject`, { body: { data: { project: config.projectGid } } });
  return { success: true, removed: true, taskGid: config.taskGid, projectGid: config.projectGid };
}

async function opAddTag(config, client) {
  if (!config.taskGid || !config.tagGid) return { success: false, error: "Asana addTag: 'taskGid' and 'tagGid' are required.", skipped: true };
  await req(client, "POST", `/tasks/${encodeURIComponent(config.taskGid)}/addTag`, { body: { data: { tag: config.tagGid } } });
  return { success: true, added: true, taskGid: config.taskGid, tagGid: config.tagGid };
}

async function opRemoveTag(config, client) {
  if (!config.taskGid || !config.tagGid) return { success: false, error: "Asana removeTag: 'taskGid' and 'tagGid' are required.", skipped: true };
  await req(client, "POST", `/tasks/${encodeURIComponent(config.taskGid)}/removeTag`, { body: { data: { tag: config.tagGid } } });
  return { success: true, removed: true, taskGid: config.taskGid, tagGid: config.tagGid };
}

async function opAddFollowers(config, client) {
  if (!config.taskGid || !config.followers) return { success: false, error: "Asana addFollowers: 'taskGid' and 'followers' are required.", skipped: true };
  await req(client, "POST", `/tasks/${encodeURIComponent(config.taskGid)}/addFollowers`, { body: { data: { followers: csvGids(config.followers) } } });
  return { success: true, added: true, taskGid: config.taskGid };
}

async function opRemoveFollowers(config, client) {
  if (!config.taskGid || !config.followers) return { success: false, error: "Asana removeFollowers: 'taskGid' and 'followers' are required.", skipped: true };
  await req(client, "POST", `/tasks/${encodeURIComponent(config.taskGid)}/removeFollowers`, { body: { data: { followers: csvGids(config.followers) } } });
  return { success: true, removed: true, taskGid: config.taskGid };
}

async function opSetDependencies(config, client) {
  if (!config.taskGid || !config.dependencies) return { success: false, error: "Asana setDependencies: 'taskGid' and 'dependencies' are required.", skipped: true };
  await req(client, "POST", `/tasks/${encodeURIComponent(config.taskGid)}/addDependencies`, { body: { data: { dependencies: csvGids(config.dependencies) } } });
  return { success: true, set: true, taskGid: config.taskGid };
}

async function opListSubtasks(config, client) {
  if (!config.taskGid) return { success: false, error: "Asana listSubtasks: 'taskGid' is required.", skipped: true };
  const data = await req(client, "GET", `/tasks/${encodeURIComponent(config.taskGid)}/subtasks`, { params: { opt_fields: config.optFields || TASK_FIELDS } });
  return { success: true, subtasks: data ?? [] };
}

async function opCreateSubtask(config, client) {
  if (!config.taskGid || !config.name) return { success: false, error: "Asana createSubtask: 'taskGid' and 'name' are required.", skipped: true };
  const d = buildTaskData(config);
  d.name = config.name;
  const data = await req(client, "POST", `/tasks/${encodeURIComponent(config.taskGid)}/subtasks`, { body: { data: d } });
  return { success: true, subtask: data };
}

export const taskOperations = {
  listTasks: opListTasks,
  getTask: opGetTask,
  createTask: opCreateTask,
  updateTask: opUpdateTask,
  completeTask: opCompleteTask,
  deleteTask: opDeleteTask,
  searchTasks: opSearchTasks,
  addComment: opAddComment,
  listComments: opListComments,
  addToProject: opAddToProject,
  removeFromProject: opRemoveFromProject,
  addTag: opAddTag,
  removeTag: opRemoveTag,
  addFollowers: opAddFollowers,
  removeFollowers: opRemoveFollowers,
  setDependencies: opSetDependencies,
  listSubtasks: opListSubtasks,
  createSubtask: opCreateSubtask,
};
