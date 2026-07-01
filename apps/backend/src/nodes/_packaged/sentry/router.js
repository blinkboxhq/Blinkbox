/**
 * Sentry — operation router. Merges every v1 resource map into one dispatch
 * table. Every handler is called `(config, ctx)` where ctx = { org, headers };
 * the slim entry resolves the token and builds ctx via makeReq, then passes it
 * in as `req`.
 */
import { handleError } from "./GenericFunctions.js";
import { issueOperations } from "./v1/IssueDescription.js";
import { projectOperations } from "./v1/ProjectDescription.js";
import { releaseOperations } from "./v1/ReleaseDescription.js";
import { teamOperations } from "./v1/TeamDescription.js";
import { organizationOperations } from "./v1/OrganizationDescription.js";
import { monitoringOperations } from "./v1/MonitoringDescription.js";

export const OPERATIONS = {
  ...issueOperations,
  ...projectOperations,
  ...releaseOperations,
  ...teamOperations,
  ...organizationOperations,
  ...monitoringOperations,
};

export const DEFAULT_OPERATION = "listIssues";

export async function run(config, req) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Sentry: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, req);
  } catch (err) {
    handleError(err);
  }
}
