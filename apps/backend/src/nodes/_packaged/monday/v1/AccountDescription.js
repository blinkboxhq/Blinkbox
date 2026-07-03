/**
 * Monday.com — account-level resources: Workspace, User, Team, Tag, and the
 * `me` lookup. Everything that isn't scoped to a single board lives here.
 */
import { gql, boundLimit } from "../GenericFunctions.js";

/* ---- Me / User ---- */
async function opGetMe(config, client) {
  const result = await gql(client, `query { me { id name email is_admin is_guest photo_thumb } }`);
  return { success: true, ...result.me };
}

async function opListUsers(config, client) {
  const result = await gql(client, `
    query($limit: Int) { users(limit: $limit) { id name email is_admin is_guest enabled teams { id name } } }
  `, { limit: boundLimit(config.limit, 500) });
  return { success: true, users: result.users ?? [] };
}

async function opGetUser(config, client) {
  if (!config.userId) return { success: false, error: "Monday getUser: userId required.", skipped: true };
  const result = await gql(client, `
    query($id: ID!) { users(ids: [$id]) { id name email is_admin is_guest enabled title phone location } }
  `, { id: String(config.userId) });
  const user = result.users?.[0];
  if (!user) return { success: false, error: `Monday: User ${config.userId} not found.`, skipped: true };
  return { success: true, ...user };
}

/* ---- Team ---- */
async function opListTeams(config, client) {
  const result = await gql(client, `query { teams { id name picture_url users { id name } } }`);
  return { success: true, teams: result.teams ?? [] };
}

/* ---- Workspace ---- */
async function opListWorkspaces(config, client) {
  const result = await gql(client, `
    query($limit: Int) { workspaces(limit: $limit) { id name kind description state } }
  `, { limit: boundLimit(config.limit, 100) });
  return { success: true, workspaces: result.workspaces ?? [] };
}

async function opCreateWorkspace(config, client) {
  if (!config.workspaceName) return { success: false, error: "Monday createWorkspace: workspaceName required.", skipped: true };
  const kind = ["open", "closed"].includes(config.workspaceKind) ? config.workspaceKind : "open";
  const result = await gql(client, `
    mutation($name: String!, $kind: WorkspaceKind!, $description: String) {
      create_workspace(name: $name, kind: $kind, description: $description) { id name kind description }
    }
  `, { name: config.workspaceName, kind, description: config.description || null });
  return { success: true, ...result.create_workspace };
}

async function opDeleteWorkspace(config, client) {
  if (!config.workspaceId) return { success: false, error: "Monday deleteWorkspace: workspaceId required.", skipped: true };
  const result = await gql(client, `mutation($id: ID!) { delete_workspace(workspace_id: $id) { id } }`, { id: String(config.workspaceId) });
  return { success: true, deleted: true, id: result.delete_workspace?.id };
}

/* ---- Tag ---- */
async function opListTags(config, client) {
  const result = await gql(client, `query { tags { id name color } }`);
  return { success: true, tags: result.tags ?? [] };
}

async function opCreateOrGetTag(config, client) {
  if (!config.tagName) return { success: false, error: "Monday createOrGetTag: tagName required.", skipped: true };
  const result = await gql(client, `
    mutation($name: String!, $boardId: ID) { create_or_get_tag(tag_name: $name, board_id: $boardId) { id name color } }
  `, { name: config.tagName, boardId: config.boardId ? String(config.boardId) : null });
  return { success: true, ...result.create_or_get_tag };
}

export const accountOperations = {
  getMe: opGetMe,
  listUsers: opListUsers,
  getUser: opGetUser,
  listTeams: opListTeams,
  listWorkspaces: opListWorkspaces,
  createWorkspace: opCreateWorkspace,
  deleteWorkspace: opDeleteWorkspace,
  listTags: opListTags,
  createOrGetTag: opCreateOrGetTag,
};
