/**
 * Linear — Issue resource. Handlers receive `(config, apiKey)`.
 */
import { gql, LIMIT, ISSUE_FIELDS } from "../GenericFunctions.js";

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

export const issueOperations = {
  createIssue: opCreateIssue,
  getIssue: opGetIssue,
  updateIssue: opUpdateIssue,
  archiveIssue: opArchiveIssue,
  listIssues: opListIssues,
  searchIssues: opSearchIssues,
  assignIssue: opAssignIssue,
  setIssueState: opSetIssueState,
  subscribeToIssue: opSubscribeToIssue,
};
