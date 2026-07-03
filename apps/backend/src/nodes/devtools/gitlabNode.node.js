/**
 * GITLAB NODE — slim entry. Resolves the PAT credential + SSRF-checked base URL
 * into a project-scoped client, then delegates op dispatch to the modular router
 * under _packaged/gitlab/. Preserves the monolith's contract EXACTLY: a missing
 * `project` SKIPS up-front (before any credential/SSRF work), unknown operations
 * THROW (double-quoted, with a Valid: list), per-op validation SKIPS, and REST
 * errors map to friendly messages via handleError. Handlers receive
 * (config, client).
 */
import { getClient, handleError } from "../_packaged/gitlab/GenericFunctions.js";
import { run as runGitlab, DEFAULT_OPERATION } from "../_packaged/gitlab/router.js";

export default {
  async run(config, input, context) {
    const operation = config.operation || DEFAULT_OPERATION;
    const projectId = config.project || config.projectId || input?.projectId;
    if (projectId == null) {
      return { success: false, error: "gitlab: 'project' (ID or namespace/name) is required.", skipped: true };
    }

    try {
      const client = await getClient(config, { ...context, input });
      return await runGitlab({ ...config, operation }, client);
    } catch (err) {
      return handleError(err);
    }
  },
};
