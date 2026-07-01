/**
 * Netlify — operation router. Merges every v1 resource map into one dispatch
 * table. Every handler is called `(config, { api })`; the slim entry resolves
 * the PAT, builds the requester via makeReq, and passes it in.
 */
import { handleError } from "./GenericFunctions.js";
import { siteOperations } from "./v1/SiteDescription.js";
import { deployOperations } from "./v1/DeployDescription.js";
import { envVarOperations } from "./v1/EnvVarDescription.js";
import { dnsOperations } from "./v1/DnsDescription.js";
import { miscOperations } from "./v1/MiscDescription.js";

export const OPERATIONS = {
  ...siteOperations,
  ...deployOperations,
  ...envVarOperations,
  ...dnsOperations,
  ...miscOperations,
};

export const DEFAULT_OPERATION = "listSites";

export async function run(config, req) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Netlify: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, req);
  } catch (err) {
    handleError(err);
  }
}
