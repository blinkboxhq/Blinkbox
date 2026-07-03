/**
 * Asana — account-level resources: Tag, Team, User, Workspace, and Story
 * (comment) lookups.
 */
import { req } from "../GenericFunctions.js";

/* ---- Tag ---- */
async function opListTags(config, client) {
  const params = { opt_fields: "gid,name,color,notes" };
  if (config.workspaceGid) params.workspace = config.workspaceGid;
  const data = await req(client, "GET", `/tags`, { params });
  return { success: true, tags: data ?? [] };
}

async function opGetTag(config, client) {
  if (!config.tagGid) return { success: false, error: "Asana getTag: 'tagGid' is required.", skipped: true };
  const data = await req(client, "GET", `/tags/${encodeURIComponent(config.tagGid)}`, { params: { opt_fields: "gid,name,color,notes,followers.name" } });
  return { success: true, tag: data };
}

async function opCreateTag(config, client) {
  if (!config.name || !config.workspaceGid) return { success: false, error: "Asana createTag: 'name' and 'workspaceGid' are required.", skipped: true };
  const d = { name: config.name, workspace: config.workspaceGid };
  if (config.color) d.color = config.color;
  const data = await req(client, "POST", `/tags`, { body: { data: d } });
  return { success: true, tag: data };
}

async function opDeleteTag(config, client) {
  if (!config.tagGid) return { success: false, error: "Asana deleteTag: 'tagGid' is required.", skipped: true };
  await req(client, "DELETE", `/tags/${encodeURIComponent(config.tagGid)}`);
  return { success: true, deleted: true, gid: config.tagGid };
}

/* ---- Team ---- */
async function opListTeams(config, client) {
  if (!config.workspaceGid) return { success: false, error: "Asana listTeams: 'workspaceGid' is required.", skipped: true };
  const data = await req(client, "GET", `/organizations/${encodeURIComponent(config.workspaceGid)}/teams`, { params: { opt_fields: "gid,name,description" } });
  return { success: true, teams: data ?? [] };
}

async function opGetTeam(config, client) {
  if (!config.teamGid) return { success: false, error: "Asana getTeam: 'teamGid' is required.", skipped: true };
  const data = await req(client, "GET", `/teams/${encodeURIComponent(config.teamGid)}`, { params: { opt_fields: "gid,name,description,organization.name" } });
  return { success: true, team: data };
}

async function opListTeamUsers(config, client) {
  if (!config.teamGid) return { success: false, error: "Asana listTeamUsers: 'teamGid' is required.", skipped: true };
  const data = await req(client, "GET", `/teams/${encodeURIComponent(config.teamGid)}/users`, { params: { opt_fields: "gid,name,email" } });
  return { success: true, users: data ?? [] };
}

/* ---- User ---- */
async function opGetMe(config, client) {
  const data = await req(client, "GET", `/users/me`, { params: { opt_fields: "gid,name,email,workspaces.name,photo" } });
  return { success: true, user: data };
}

async function opGetUser(config, client) {
  if (!config.userGid) return { success: false, error: "Asana getUser: 'userGid' is required.", skipped: true };
  const data = await req(client, "GET", `/users/${encodeURIComponent(config.userGid)}`, { params: { opt_fields: "gid,name,email,workspaces.name,photo" } });
  return { success: true, user: data };
}

async function opListUsers(config, client) {
  const params = { opt_fields: "gid,name,email" };
  if (config.workspaceGid) params.workspace = config.workspaceGid;
  if (config.teamGid) params.team = config.teamGid;
  const data = await req(client, "GET", `/users`, { params });
  return { success: true, users: data ?? [] };
}

/* ---- Workspace ---- */
async function opListWorkspaces(config, client) {
  const data = await req(client, "GET", `/workspaces`, { params: { opt_fields: "gid,name,is_organization" } });
  return { success: true, workspaces: data ?? [] };
}

async function opGetWorkspace(config, client) {
  if (!config.workspaceGid) return { success: false, error: "Asana getWorkspace: 'workspaceGid' is required.", skipped: true };
  const data = await req(client, "GET", `/workspaces/${encodeURIComponent(config.workspaceGid)}`, { params: { opt_fields: "gid,name,is_organization,email_domains" } });
  return { success: true, workspace: data };
}

/* ---- Story (comment) ---- */
async function opGetStory(config, client) {
  if (!config.storyGid) return { success: false, error: "Asana getStory: 'storyGid' is required.", skipped: true };
  const data = await req(client, "GET", `/stories/${encodeURIComponent(config.storyGid)}`, { params: { opt_fields: "gid,text,html_text,created_at,created_by.name,type" } });
  return { success: true, story: data };
}

async function opUpdateStory(config, client) {
  if (!config.storyGid || config.text == null) return { success: false, error: "Asana updateStory: 'storyGid' and 'text' are required.", skipped: true };
  const data = await req(client, "PUT", `/stories/${encodeURIComponent(config.storyGid)}`, { body: { data: { text: config.text } } });
  return { success: true, story: data };
}

async function opDeleteStory(config, client) {
  if (!config.storyGid) return { success: false, error: "Asana deleteStory: 'storyGid' is required.", skipped: true };
  await req(client, "DELETE", `/stories/${encodeURIComponent(config.storyGid)}`);
  return { success: true, deleted: true, gid: config.storyGid };
}

export const accountOperations = {
  listTags: opListTags,
  getTag: opGetTag,
  createTag: opCreateTag,
  deleteTag: opDeleteTag,
  listTeams: opListTeams,
  getTeam: opGetTeam,
  listTeamUsers: opListTeamUsers,
  getMe: opGetMe,
  getUser: opGetUser,
  listUsers: opListUsers,
  listWorkspaces: opListWorkspaces,
  getWorkspace: opGetWorkspace,
  getStory: opGetStory,
  updateStory: opUpdateStory,
  deleteStory: opDeleteStory,
};
