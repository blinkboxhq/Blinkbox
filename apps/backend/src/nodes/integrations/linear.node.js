/**
 * LINEAR NODE
 * Manage issues, projects, cycles, labels and teams via the Linear GraphQL API.
 *
 * Auth: Linear API key stored in vault (lin_api_...).
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://api.linear.app/graphql";

async function getKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Linear");
}

async function gql(query, variables, apiKey) {
  const res = await axios.post(BASE, { query, variables }, {
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    timeout: 15000,
  });
  if (res.data.errors?.length) throw new Error(`Linear: ${res.data.errors[0].message}`);
  return res.data.data;
}

const LIMIT = (config, def = 25) => Math.min(Number(config.limit || def), 100);

const ISSUE_FIELDS = "id identifier title description priority url state { name } assignee { name } team { key } createdAt updatedAt";

/* ------------------------------ ISSUES -------------------------- */

async function opCreateIssue(config, apiKey) {
  if (!config.teamId || !config.title) return { success: false, error: "Linear createIssue: 'teamId' and 'title' are required.", skipped: true };
  const input = { teamId: config.teamId, title: config.title };
  if (config.description) input.description = config.description;
  if (config.priority !== undefined && config.priority !== "") input.priority = Number(config.priority);
  if (config.stateId) input.stateId = config.stateId;
  if (config.assigneeId) input.assigneeId = config.assigneeId;
  if (config.projectId) input.projectId = config.projectId;
  if (config.parentId) input.parentId = config.parentId;
  if (config.dueDate) input.dueDate = config.dueDate;
  if (config.labelIds) input.labelIds = String(config.labelIds).split(",").map((s) => s.trim()).filter(Boolean);
  const data = await gql(`mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier title url } } }`, { input }, apiKey);
  const i = data.issueCreate.issue;
  return { id: i.id, identifier: i.identifier, title: i.title, url: i.url, created: true };
}

async function opGetIssue(config, apiKey) {
  if (!config.issueId) return { success: false, error: "Linear getIssue: 'issueId' or identifier is required.", skipped: true };
  const data = await gql(`query($id: String!) { issue(id: $id) { ${ISSUE_FIELDS} } }`, { id: config.issueId }, apiKey);
  const i = data.issue;
  return { id: i.id, identifier: i.identifier, title: i.title, description: i.description, state: i.state?.name, assignee: i.assignee?.name, priority: i.priority, team: i.team?.key, url: i.url };
}

async function opUpdateIssue(config, apiKey) {
  if (!config.issueId) return { success: false, error: "Linear updateIssue: 'issueId' is required.", skipped: true };
  const input = {};
  if (config.title) input.title = config.title;
  if (config.description) input.description = config.description;
  if (config.priority !== undefined && config.priority !== "") input.priority = Number(config.priority);
  if (config.stateId) input.stateId = config.stateId;
  if (config.assigneeId) input.assigneeId = config.assigneeId;
  if (config.projectId) input.projectId = config.projectId;
  if (config.dueDate) input.dueDate = config.dueDate;
  await gql(`mutation($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success } }`, { id: config.issueId, input }, apiKey);
  return { updated: true, issueId: config.issueId };
}

async function opArchiveIssue(config, apiKey) {
  if (!config.issueId) return { success: false, error: "Linear archiveIssue: 'issueId' is required.", skipped: true };
  await gql(`mutation($id: String!) { issueArchive(id: $id) { success } }`, { id: config.issueId }, apiKey);
  return { archived: true, issueId: config.issueId };
}

async function opListIssues(config, apiKey) {
  if (!config.teamId) return { success: false, error: "Linear listIssues: 'teamId' is required.", skipped: true };
  const data = await gql(`query($teamId: String!, $first: Int) { team(id: $teamId) { issues(first: $first, orderBy: updatedAt) { nodes { ${ISSUE_FIELDS} } } } }`, { teamId: config.teamId, first: LIMIT(config) }, apiKey);
  const issues = data.team.issues.nodes;
  return { issues: issues.map((i) => ({ id: i.id, identifier: i.identifier, title: i.title, state: i.state?.name, assignee: i.assignee?.name, priority: i.priority, url: i.url })), count: issues.length };
}

async function opSearchIssues(config, apiKey) {
  if (!config.query) return { success: false, error: "Linear searchIssues: 'query' is required.", skipped: true };
  const data = await gql(`query($term: String!, $first: Int) { searchIssues(term: $term, first: $first) { nodes { ${ISSUE_FIELDS} } } }`, { term: config.query, first: LIMIT(config) }, apiKey);
  const issues = data.searchIssues.nodes;
  return { issues: issues.map((i) => ({ id: i.id, identifier: i.identifier, title: i.title, state: i.state?.name, url: i.url })), count: issues.length };
}

async function opAssignIssue(config, apiKey) {
  if (!config.issueId || !config.assigneeId) return { success: false, error: "Linear assignIssue: 'issueId' and 'assigneeId' are required.", skipped: true };
  await gql(`mutation($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success } }`, { id: config.issueId, input: { assigneeId: config.assigneeId } }, apiKey);
  return { assigned: true, issueId: config.issueId, assigneeId: config.assigneeId };
}

async function opSetIssueState(config, apiKey) {
  if (!config.issueId || !config.stateId) return { success: false, error: "Linear setIssueState: 'issueId' and 'stateId' are required.", skipped: true };
  await gql(`mutation($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success } }`, { id: config.issueId, input: { stateId: config.stateId } }, apiKey);
  return { updated: true, issueId: config.issueId, stateId: config.stateId };
}

async function opSubscribeToIssue(config, apiKey) {
  if (!config.issueId || !config.userId) return { success: false, error: "Linear subscribeToIssue: 'issueId' and 'userId' are required.", skipped: true };
  await gql(`mutation($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success } }`, { id: config.issueId, input: { subscriberIds: [config.userId] } }, apiKey);
  return { subscribed: true, issueId: config.issueId };
}

/* ----------------------------- COMMENTS ------------------------- */

async function opCreateComment(config, apiKey) {
  if (!config.issueId || !config.body) return { success: false, error: "Linear createComment: 'issueId' and 'body' are required.", skipped: true };
  const data = await gql(`mutation($input: CommentCreateInput!) { commentCreate(input: $input) { success comment { id url } } }`, { input: { issueId: config.issueId, body: config.body } }, apiKey);
  return { id: data.commentCreate.comment.id, url: data.commentCreate.comment.url, created: true };
}

async function opListComments(config, apiKey) {
  if (!config.issueId) return { success: false, error: "Linear listComments: 'issueId' is required.", skipped: true };
  const data = await gql(`query($id: String!) { issue(id: $id) { comments(first: 50) { nodes { id body user { name } createdAt } } } }`, { id: config.issueId }, apiKey);
  const c = data.issue.comments.nodes;
  return { comments: c.map((x) => ({ id: x.id, body: x.body, author: x.user?.name, createdAt: x.createdAt })), count: c.length };
}

/* ------------------------------ LABELS -------------------------- */

async function opListLabels(config, apiKey) {
  const data = await gql(`query($first: Int) { issueLabels(first: $first) { nodes { id name color team { key } } } }`, { first: LIMIT(config, 50) }, apiKey);
  return { labels: data.issueLabels.nodes.map((l) => ({ id: l.id, name: l.name, color: l.color, team: l.team?.key })) };
}

async function opCreateLabel(config, apiKey) {
  if (!config.name) return { success: false, error: "Linear createLabel: 'name' is required.", skipped: true };
  const input = { name: config.name };
  if (config.teamId) input.teamId = config.teamId;
  if (config.color) input.color = config.color;
  const data = await gql(`mutation($input: IssueLabelCreateInput!) { issueLabelCreate(input: $input) { success issueLabel { id name } } }`, { input }, apiKey);
  return { id: data.issueLabelCreate.issueLabel.id, name: data.issueLabelCreate.issueLabel.name, created: true };
}

async function opAddLabelToIssue(config, apiKey) {
  if (!config.issueId || !config.labelIds) return { success: false, error: "Linear addLabelToIssue: 'issueId' and 'labelIds' are required.", skipped: true };
  const labelIds = String(config.labelIds).split(",").map((s) => s.trim()).filter(Boolean);
  await gql(`mutation($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success } }`, { id: config.issueId, input: { labelIds } }, apiKey);
  return { updated: true, issueId: config.issueId, labelIds };
}

/* ----------------------------- PROJECTS ------------------------- */

async function opCreateProject(config, apiKey) {
  if (!config.name || !config.teamIds) return { success: false, error: "Linear createProject: 'name' and 'teamIds' are required.", skipped: true };
  const teamIds = String(config.teamIds).split(",").map((s) => s.trim()).filter(Boolean);
  const input = { name: config.name, teamIds };
  if (config.description) input.description = config.description;
  if (config.state) input.state = config.state;
  if (config.targetDate) input.targetDate = config.targetDate;
  const data = await gql(`mutation($input: ProjectCreateInput!) { projectCreate(input: $input) { success project { id name url } } }`, { input }, apiKey);
  const p = data.projectCreate.project;
  return { id: p.id, name: p.name, url: p.url, created: true };
}

async function opGetProject(config, apiKey) {
  if (!config.projectId) return { success: false, error: "Linear getProject: 'projectId' is required.", skipped: true };
  const data = await gql(`query($id: String!) { project(id: $id) { id name description state url progress targetDate lead { name } } }`, { id: config.projectId }, apiKey);
  const p = data.project;
  return { id: p.id, name: p.name, description: p.description, state: p.state, progress: p.progress, targetDate: p.targetDate, lead: p.lead?.name, url: p.url };
}

async function opUpdateProject(config, apiKey) {
  if (!config.projectId) return { success: false, error: "Linear updateProject: 'projectId' is required.", skipped: true };
  const input = {};
  if (config.name) input.name = config.name;
  if (config.description) input.description = config.description;
  if (config.state) input.state = config.state;
  if (config.targetDate) input.targetDate = config.targetDate;
  await gql(`mutation($id: String!, $input: ProjectUpdateInput!) { projectUpdate(id: $id, input: $input) { success } }`, { id: config.projectId, input }, apiKey);
  return { updated: true, projectId: config.projectId };
}

async function opListProjects(config, apiKey) {
  const data = await gql(`query($first: Int) { projects(first: $first, orderBy: updatedAt) { nodes { id name description state url progress targetDate } } }`, { first: LIMIT(config) }, apiKey);
  return { projects: data.projects.nodes, count: data.projects.nodes.length };
}

async function opListProjectMilestones(config, apiKey) {
  if (!config.projectId) return { success: false, error: "Linear listProjectMilestones: 'projectId' is required.", skipped: true };
  const data = await gql(`query($id: String!) { project(id: $id) { projectMilestones(first: 50) { nodes { id name targetDate } } } }`, { id: config.projectId }, apiKey);
  return { milestones: data.project.projectMilestones.nodes };
}

async function opCreateProjectMilestone(config, apiKey) {
  if (!config.projectId || !config.name) return { success: false, error: "Linear createProjectMilestone: 'projectId' and 'name' are required.", skipped: true };
  const input = { projectId: config.projectId, name: config.name };
  if (config.targetDate) input.targetDate = config.targetDate;
  const data = await gql(`mutation($input: ProjectMilestoneCreateInput!) { projectMilestoneCreate(input: $input) { success projectMilestone { id name } } }`, { input }, apiKey);
  return { id: data.projectMilestoneCreate.projectMilestone.id, name: data.projectMilestoneCreate.projectMilestone.name, created: true };
}

/* ------------------------------ CYCLES -------------------------- */

async function opListCycles(config, apiKey) {
  if (!config.teamId) return { success: false, error: "Linear listCycles: 'teamId' is required.", skipped: true };
  const data = await gql(`query($id: String!) { team(id: $id) { cycles(first: 50) { nodes { id number name startsAt endsAt completedAt } } } }`, { id: config.teamId }, apiKey);
  return { cycles: data.team.cycles.nodes };
}

/* ------------------------------ TEAMS --------------------------- */

async function opListTeams(config, apiKey) {
  const data = await gql(`query { teams { nodes { id name key } } }`, {}, apiKey);
  return { teams: data.teams.nodes, count: data.teams.nodes.length };
}

async function opGetTeam(config, apiKey) {
  if (!config.teamId) return { success: false, error: "Linear getTeam: 'teamId' is required.", skipped: true };
  const data = await gql(`query($id: String!) { team(id: $id) { id name key description issueCount cyclesEnabled } }`, { id: config.teamId }, apiKey);
  return data.team;
}

async function opListTeamStates(config, apiKey) {
  if (!config.teamId) return { success: false, error: "Linear listTeamStates: 'teamId' is required.", skipped: true };
  const data = await gql(`query($id: String!) { team(id: $id) { states { nodes { id name type color } } } }`, { id: config.teamId }, apiKey);
  return { states: data.team.states.nodes };
}

async function opListTeamMembers(config, apiKey) {
  if (!config.teamId) return { success: false, error: "Linear listTeamMembers: 'teamId' is required.", skipped: true };
  const data = await gql(`query($id: String!) { team(id: $id) { members { nodes { id name email active } } } }`, { id: config.teamId }, apiKey);
  return { members: data.team.members.nodes };
}

/* ------------------------------ USERS --------------------------- */

async function opListUsers(config, apiKey) {
  const data = await gql(`query($first: Int) { users(first: $first) { nodes { id name email active admin } } }`, { first: LIMIT(config, 50) }, apiKey);
  return { users: data.users.nodes, count: data.users.nodes.length };
}

async function opGetViewer(config, apiKey) {
  const data = await gql(`query { viewer { id name email admin } }`, {}, apiKey);
  return data.viewer;
}

/* --------------------------- ATTACHMENTS ------------------------ */

async function opCreateAttachment(config, apiKey) {
  if (!config.issueId || !config.url) return { success: false, error: "Linear createAttachment: 'issueId' and 'url' are required.", skipped: true };
  if (!/^https?:\/\//i.test(config.url)) return { success: false, error: "Linear createAttachment: 'url' must be http(s).", skipped: true };
  const input = { issueId: config.issueId, url: config.url, title: config.title || config.url };
  const data = await gql(`mutation($input: AttachmentCreateInput!) { attachmentCreate(input: $input) { success attachment { id } } }`, { input }, apiKey);
  return { id: data.attachmentCreate.attachment.id, created: true };
}

const OPERATIONS = {
  createIssue: opCreateIssue,
  getIssue: opGetIssue,
  updateIssue: opUpdateIssue,
  archiveIssue: opArchiveIssue,
  listIssues: opListIssues,
  searchIssues: opSearchIssues,
  assignIssue: opAssignIssue,
  setIssueState: opSetIssueState,
  subscribeToIssue: opSubscribeToIssue,
  createComment: opCreateComment,
  addComment: opCreateComment,
  listComments: opListComments,
  listLabels: opListLabels,
  createLabel: opCreateLabel,
  addLabelToIssue: opAddLabelToIssue,
  createProject: opCreateProject,
  getProject: opGetProject,
  updateProject: opUpdateProject,
  listProjects: opListProjects,
  listProjectMilestones: opListProjectMilestones,
  createProjectMilestone: opCreateProjectMilestone,
  listCycles: opListCycles,
  listTeams: opListTeams,
  getTeam: opGetTeam,
  listTeamStates: opListTeamStates,
  listTeamMembers: opListTeamMembers,
  listUsers: opListUsers,
  getViewer: opGetViewer,
  createAttachment: opCreateAttachment,
};

function handleError(err) {
  if (err.message?.startsWith("Linear")) throw err;
  const status = err.response?.status;
  if (status === 401 || status === 403) throw new Error("Linear: Invalid API key.");
  if (status === 429) throw new Error("Linear: Rate limit exceeded. Slow down requests.");
  throw new Error(`Linear: ${err.message}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "listIssues" } = config;

    const handler = OPERATIONS[operation];
    if (!handler) return { success: false, error: `Linear: Unknown operation "${operation}".`, skipped: true };

    if (!config.credentialId) return { success: false, error: "Linear: credential required.", skipped: true };

    let apiKey;
    try {
      apiKey = await getKey(config.credentialId, context.workspaceId);
    } catch (err) {
      return { success: false, error: `Linear: Failed to resolve credential — ${err.message}`, skipped: true };
    }

    try {
      return await handler(config, apiKey, context);
    } catch (err) {
      handleError(err);
    }
  },
};
