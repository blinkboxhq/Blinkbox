/**
 * Vercel — operation router. Merges every v1 resource map into one dispatch
 * table and runs the selected op. Handlers receive `(config, { api })` where
 * `api` is the axios instance built by the backend entry with the resolved token.
 */
import { handleError } from "./GenericFunctions.js";
import { deploymentOperations } from "./v1/DeploymentDescription.js";
import { projectOperations } from "./v1/ProjectDescription.js";
import { envVarOperations } from "./v1/EnvVarDescription.js";
import { domainOperations } from "./v1/DomainDescription.js";
import { aliasOperations } from "./v1/AliasDescription.js";
import { teamOperations } from "./v1/TeamDescription.js";

export const OPERATIONS = {
  ...deploymentOperations,
  ...projectOperations,
  ...envVarOperations,
  ...domainOperations,
  ...aliasOperations,
  ...teamOperations,
};

export const DEFAULT_OPERATION = "listDeployments";

export async function run(config, requester) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Vercel: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, requester);
  } catch (err) {
    handleError(err);
  }
}
