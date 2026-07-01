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
