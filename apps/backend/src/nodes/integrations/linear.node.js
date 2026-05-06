/**
 * LINEAR NODE
 * Manage issues in Linear via the GraphQL API.
 *
 * Operations:
 *   createIssue   — Create a new issue
 *   getIssue      — Get issue by ID or identifier (ENG-123)
 *   updateIssue   — Update issue fields
 *   listIssues    — List issues for a team with optional filters
 *   createComment — Add a comment to an issue
 *   listTeams     — List all teams in the workspace
 *
 * Auth: Linear API key stored in vault (lin_api_...)
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE = "https://api.linear.app/graphql";

async function getKey(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Linear");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

async function gql(query, variables, apiKey) {
  const res = await axios.post(BASE, { query, variables }, {
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    timeout: 15000,
  });
  if (res.data.errors?.length) {
    throw new Error(`Linear: ${res.data.errors[0].message}`);
  }
  return res.data.data;
}

function handleError(err) {
  if (err.message?.startsWith("Linear")) throw err;
  const status = err.response?.status;
  if (status === 401 || status === 403) throw new Error("Linear: Invalid API key.");
  throw new Error(`Linear: ${err.message}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "listIssues" } = config;
    const apiKey = await getKey(config.credentialId, context.workspaceId);

    try {
      switch (operation) {
        case "createIssue": {
          const { teamId, title, description, priority, stateId, assigneeId } = config;
          if (!teamId || !title) return { success: false, error: "Linear createIssue: 'teamId' and 'title' are required.", skipped: true };
          const data = await gql(`mutation CreateIssue($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier title url } } }`,
            { input: { teamId, title, description, priority: priority ? Number(priority) : undefined, stateId, assigneeId } }, apiKey);
          const issue = data.issueCreate.issue;
          return { id: issue.id, identifier: issue.identifier, title: issue.title, url: issue.url };
        }

        case "getIssue": {
          if (!config.issueId) return { success: false, error: "Linear getIssue: 'issueId' or identifier is required.", skipped: true };
          const byId = config.issueId.includes("-") ? "identifier" : "id";
          const query = byId === "identifier"
            ? `query($id: String!) { issue(id: $id) { id identifier title description state { name } assignee { name } url priority } }`
            : `query($id: String!) { issue(id: $id) { id identifier title description state { name } assignee { name } url priority } }`;
          const data = await gql(query, { id: config.issueId }, apiKey);
          const i = data.issue;
          return { id: i.id, identifier: i.identifier, title: i.title, description: i.description, state: i.state?.name, assignee: i.assignee?.name, priority: i.priority, url: i.url };
        }

        case "updateIssue": {
          if (!config.issueId) return { success: false, error: "Linear updateIssue: 'issueId' is required.", skipped: true };
          const input = {};
          if (config.title) input.title = config.title;
          if (config.description) input.description = config.description;
          if (config.priority !== undefined) input.priority = Number(config.priority);
          if (config.stateId) input.stateId = config.stateId;
          if (config.assigneeId) input.assigneeId = config.assigneeId;
          await gql(`mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success } }`, { id: config.issueId, input }, apiKey);
          return { updated: true, issueId: config.issueId };
        }

        case "listIssues": {
          if (!config.teamId) return { success: false, error: "Linear listIssues: 'teamId' is required.", skipped: true };
          const data = await gql(`query($teamId: String!, $first: Int) { team(id: $teamId) { issues(first: $first, orderBy: updatedAt) { nodes { id identifier title state { name } assignee { name } url priority } } } }`,
            { teamId: config.teamId, first: Math.min(Number(config.limit ?? 25), 100) }, apiKey);
          const issues = data.team.issues.nodes;
          return { issues: issues.map((i) => ({ id: i.id, identifier: i.identifier, title: i.title, state: i.state?.name, assignee: i.assignee?.name, url: i.url })), count: issues.length };
        }

        case "createComment": {
          if (!config.issueId || !config.body) return { success: false, error: "Linear createComment: 'issueId' and 'body' are required.", skipped: true };
          const data = await gql(`mutation CreateComment($input: CommentCreateInput!) { commentCreate(input: $input) { success comment { id createdAt } } }`,
            { input: { issueId: config.issueId, body: config.body } }, apiKey);
          return { id: data.commentCreate.comment.id, created: true };
        }

        case "listTeams": {
          const data = await gql(`query { teams { nodes { id name key } } }`, {}, apiKey);
          return { teams: data.teams.nodes, count: data.teams.nodes.length };
        }

        default:
          throw new Error(`Linear: Unknown operation "${operation}".`);
      }
    } catch (err) { handleError(err); }
  },
};
