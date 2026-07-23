/**
 * Linear — operation router. Merges every v1 resource map into one dispatch
 * table. Every handler is called `(config, apiKey)`; the slim entry resolves the
 * API key and passes it (via makeReq) through as the requester.
 */
import { handleError } from "./GenericFunctions.js";
import { issueOperations } from "./v1/IssueDescription.js";
import { commentOperations } from "./v1/CommentDescription.js";
import { labelOperations } from "./v1/LabelDescription.js";
import { projectOperations } from "./v1/ProjectDescription.js";
import { cycleOperations } from "./v1/CycleDescription.js";
import { teamOperations } from "./v1/TeamDescription.js";
import { userOperations } from "./v1/UserDescription.js";
import { attachmentOperations } from "./v1/AttachmentDescription.js";

export const OPERATIONS = {
  ...issueOperations,
  ...commentOperations,
  ...labelOperations,
  ...projectOperations,
  ...cycleOperations,
  ...teamOperations,
  ...userOperations,
  ...attachmentOperations,
};

export const DEFAULT_OPERATION = "listIssues";

export const OPERATION_SCHEMA = {
  createIssue: { description: "Create an issue in a team", recommended: true },
  getIssue: { description: "Read one issue by ID or identifier" },
  updateIssue: { description: "Update an issue's title, description, priority or assignee", recommended: true },
  archiveIssue: { description: "Archive an issue" },
  listIssues: { description: "List issues, filterable by team and state", recommended: true },
  searchIssues: { description: "Search issues by text query", recommended: true },
  assignIssue: { description: "Assign an issue to a user" },
  setIssueState: { description: "Move an issue to another workflow state" },
  subscribeToIssue: { description: "Subscribe a user to an issue's updates" },
  createComment: { description: "Comment on an issue", recommended: true },
  addComment: { description: "Add a comment to an issue" },
  listComments: { description: "List an issue's comments" },
  listLabels: { description: "List a team's labels" },
  createLabel: { description: "Create a label" },
  addLabelToIssue: { description: "Add a label to an issue" },
  createProject: { description: "Create a project" },
  getProject: { description: "Read one project by ID" },
  updateProject: { description: "Update a project's details or state" },
  listProjects: { description: "List projects" },
  listProjectMilestones: { description: "List a project's milestones" },
  createProjectMilestone: { description: "Create a milestone in a project" },
  listCycles: { description: "List a team's cycles" },
  listTeams: { description: "List teams in the workspace" },
  getTeam: { description: "Read one team by ID" },
  listTeamStates: { description: "List a team's workflow states" },
  listTeamMembers: { description: "List a team's members" },
  listUsers: { description: "List workspace users" },
  getViewer: { description: "Read the profile behind the current token" },
  createAttachment: { description: "Attach a URL to an issue" },
};

export async function run(config, req) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Linear: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, req);
  } catch (err) {
    handleError(err);
  }
}
