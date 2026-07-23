/**
 * Jira — operation router. Merges every v1 resource map into one dispatch
 * table. Every handler is called `(config, ctx)` where ctx = { domain, headers,
 * BASE, AGILE }; the slim entry resolves the credential, base64-encodes it and
 * builds ctx via makeReq().
 */
import { handleError } from "./GenericFunctions.js";
import { issueOperations } from "./v1/IssueDescription.js";
import { transitionOperations } from "./v1/TransitionDescription.js";
import { commentOperations } from "./v1/CommentDescription.js";
import { linkOperations } from "./v1/LinkDescription.js";
import { worklogOperations } from "./v1/WorklogDescription.js";
import { projectOperations } from "./v1/ProjectDescription.js";
import { userOperations } from "./v1/UserDescription.js";
import { metadataOperations } from "./v1/MetadataDescription.js";
import { agileOperations } from "./v1/AgileDescription.js";

export const OPERATIONS = {
  ...issueOperations,
  ...transitionOperations,
  ...commentOperations,
  ...linkOperations,
  ...worklogOperations,
  ...projectOperations,
  ...userOperations,
  ...metadataOperations,
  ...agileOperations,
};

export const DEFAULT_OPERATION = "searchIssues";

export const OPERATION_SCHEMA = {
  createIssue: { description: "Create an issue in a project", recommended: true },
  getIssue: { description: "Read one issue by key, including its fields" },
  updateIssue: { description: "Update an issue's summary, description or fields", recommended: true },
  deleteIssue: { description: "Delete an issue" },
  assignIssue: { description: "Assign an issue to a user" },
  searchIssues: { description: "Search issues with a JQL query", recommended: true },
  transitionIssue: { description: "Move an issue to another status", recommended: true },
  listTransitions: { description: "List the transitions available for an issue" },
  addComment: { description: "Comment on an issue", recommended: true },
  getComments: { description: "List an issue's comments" },
  updateComment: { description: "Edit a comment" },
  deleteComment: { description: "Delete a comment" },
  linkIssues: { description: "Link two issues (blocks, relates to, …)" },
  listLinkTypes: { description: "List available issue link types" },
  addWatcher: { description: "Add a watcher to an issue" },
  getWatchers: { description: "List an issue's watchers" },
  addWorklog: { description: "Log time spent on an issue" },
  getWorklogs: { description: "List an issue's worklogs" },
  listProjects: { description: "List projects" },
  getProject: { description: "Read one project by key" },
  getProjectStatuses: { description: "List a project's issue types and statuses" },
  listVersions: { description: "List a project's versions" },
  createVersion: { description: "Create a version in a project" },
  listComponents: { description: "List a project's components" },
  getCurrentUser: { description: "Read the profile behind the current token" },
  searchUsers: { description: "Find users by name or email" },
  listIssueTypes: { description: "List issue types" },
  listPriorities: { description: "List priorities" },
  getFields: { description: "List field definitions, including custom fields" },
  listBoards: { description: "List agile boards" },
  getBoardIssues: { description: "List the issues on a board" },
  listSprints: { description: "List a board's sprints" },
  createSprint: { description: "Create a sprint on a board" },
  moveIssuesToSprint: { description: "Move issues into a sprint" },
};

export async function run(config, req) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Jira: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, req);
  } catch (err) {
    handleError(err);
  }
}
