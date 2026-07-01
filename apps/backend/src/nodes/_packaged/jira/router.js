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
