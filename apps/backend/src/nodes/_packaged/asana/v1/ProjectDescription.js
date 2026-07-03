/**
 * Asana — Project & Section resources. Project CRUD + membership + duplicate,
 * and section management.
 */
import { req, csvGids, PROJECT_FIELDS } from "../GenericFunctions.js";

/* ---- Project ---- */
async function opListProjects(config, client) {
  const params = { opt_fields: config.optFields || PROJECT_FIELDS, limit: Math.min(Number(config.limit) || 50, 100) };
  if (config.workspaceGid) params.workspace = config.workspaceGid;
  if (config.teamGid) params.team = config.teamGid;
  if (config.archived != null) params.archived = config.archived;
  const data = await req(client, "GET", `/projects`, { params });
  return { success: true, projects: data ?? [], count: data?.length ?? 0 };
}

async function opGetProject(config, client) {
  if (!config.projectGid) return { success: false, error: "Asana getProject: 'projectGid' is required.", skipped: true };
  const data = await req(client, "GET", `/projects/${encodeURIComponent(config.projectGid)}`, { params: { opt_fields: config.optFields || PROJECT_FIELDS } });
  return { success: true, project: data };
}

function buildProjectData(config) {
  const d = {};
  if (config.name != null) d.name = config.name;
  if (config.notes !== undefined) d.notes = config.notes;
  if (config.color) d.color = config.color;
  if (config.public != null) d.public = config.public;
  if (config.archived != null) d.archived = config.archived;
  if (config.dueOn) d.due_on = config.dueOn;
  if (config.startOn) d.start_on = config.startOn;
  return d;
}

async function opCreateProject(config, client) {
  if (!config.name) return { success: false, error: "Asana createProject: 'name' is required.", skipped: true };
  if (!config.teamGid && !config.workspaceGid) return { success: false, error: "Asana createProject: 'teamGid' or 'workspaceGid' is required.", skipped: true };
  const d = buildProjectData(config);
  if (config.teamGid) d.team = config.teamGid;
  if (config.workspaceGid) d.workspace = config.workspaceGid;
  const data = await req(client, "POST", `/projects`, { body: { data: d } });
  return { success: true, project: data };
}

async function opUpdateProject(config, client) {
  if (!config.projectGid) return { success: false, error: "Asana updateProject: 'projectGid' is required.", skipped: true };
  const data = await req(client, "PUT", `/projects/${encodeURIComponent(config.projectGid)}`, { body: { data: buildProjectData(config) } });
  return { success: true, project: data };
}

async function opDeleteProject(config, client) {
  if (!config.projectGid) return { success: false, error: "Asana deleteProject: 'projectGid' is required.", skipped: true };
  await req(client, "DELETE", `/projects/${encodeURIComponent(config.projectGid)}`);
  return { success: true, deleted: true, gid: config.projectGid };
}

async function opDuplicateProject(config, client) {
  if (!config.projectGid || !config.name) return { success: false, error: "Asana duplicateProject: 'projectGid' and 'name' are required.", skipped: true };
  const d = { name: config.name };
  if (config.teamGid) d.team = config.teamGid;
  const data = await req(client, "POST", `/projects/${encodeURIComponent(config.projectGid)}/duplicate`, { body: { data: d } });
  return { success: true, job: data };
}

async function opAddProjectMembers(config, client) {
  if (!config.projectGid || !config.members) return { success: false, error: "Asana addProjectMembers: 'projectGid' and 'members' are required.", skipped: true };
  const data = await req(client, "POST", `/projects/${encodeURIComponent(config.projectGid)}/addMembers`, { body: { data: { members: csvGids(config.members) } } });
  return { success: true, project: data };
}

async function opRemoveProjectMembers(config, client) {
  if (!config.projectGid || !config.members) return { success: false, error: "Asana removeProjectMembers: 'projectGid' and 'members' are required.", skipped: true };
  const data = await req(client, "POST", `/projects/${encodeURIComponent(config.projectGid)}/removeMembers`, { body: { data: { members: csvGids(config.members) } } });
  return { success: true, project: data };
}

/* ---- Section ---- */
async function opListSections(config, client) {
  if (!config.projectGid) return { success: false, error: "Asana listSections: 'projectGid' is required.", skipped: true };
  const data = await req(client, "GET", `/projects/${encodeURIComponent(config.projectGid)}/sections`, { params: { opt_fields: "gid,name,created_at" } });
  return { success: true, sections: data ?? [] };
}

async function opCreateSection(config, client) {
  if (!config.projectGid || !config.name) return { success: false, error: "Asana createSection: 'projectGid' and 'name' are required.", skipped: true };
  const data = await req(client, "POST", `/projects/${encodeURIComponent(config.projectGid)}/sections`, { body: { data: { name: config.name } } });
  return { success: true, section: data };
}

async function opUpdateSection(config, client) {
  if (!config.sectionGid) return { success: false, error: "Asana updateSection: 'sectionGid' is required.", skipped: true };
  const data = await req(client, "PUT", `/sections/${encodeURIComponent(config.sectionGid)}`, { body: { data: { name: config.name } } });
  return { success: true, section: data };
}

async function opDeleteSection(config, client) {
  if (!config.sectionGid) return { success: false, error: "Asana deleteSection: 'sectionGid' is required.", skipped: true };
  await req(client, "DELETE", `/sections/${encodeURIComponent(config.sectionGid)}`);
  return { success: true, deleted: true, gid: config.sectionGid };
}

async function opAddTaskToSection(config, client) {
  if (!config.sectionGid || !config.taskGid) return { success: false, error: "Asana addTaskToSection: 'sectionGid' and 'taskGid' are required.", skipped: true };
  await req(client, "POST", `/sections/${encodeURIComponent(config.sectionGid)}/addTask`, { body: { data: { task: config.taskGid } } });
  return { success: true, added: true, sectionGid: config.sectionGid, taskGid: config.taskGid };
}

export const projectOperations = {
  listProjects: opListProjects,
  getProject: opGetProject,
  createProject: opCreateProject,
  updateProject: opUpdateProject,
  deleteProject: opDeleteProject,
  duplicateProject: opDuplicateProject,
  addProjectMembers: opAddProjectMembers,
  removeProjectMembers: opRemoveProjectMembers,
  listSections: opListSections,
  createSection: opCreateSection,
  updateSection: opUpdateSection,
  deleteSection: opDeleteSection,
  addTaskToSection: opAddTaskToSection,
};
