/**
 * GITHUB ISSUE NODE — slim entry. Resolves the GitHub token into a repo-scoped
 * Bearer client, then delegates op dispatch to the modular router under
 * _packaged/githubIssue/. Preserves the monolith's contract EXACTLY: a missing
 * token THROWS ("github_issue: GitHub token required."), a missing owner/repo
 * SKIPS (after the token check), unknown operations THROW double-quoted, per-op
 * validation SKIPS. Handlers receive (config, client).
 */
import { getClient, handleError } from "../_packaged/githubIssue/GenericFunctions.js";
import { run as runGithubIssue, DEFAULT_OPERATION } from "../_packaged/githubIssue/router.js";

export default {
  async run(config, input, context) {
    const operation = config.operation || DEFAULT_OPERATION;
    const owner = config.owner || input?.owner;
    const repo = config.repo || input?.repo;
    try {
      const client = await getClient(config, { ...context, input });
      if (!owner || !repo) return { success: false, error: "github_issue: 'owner' and 'repo' are required.", skipped: true };
      return await runGithubIssue({ ...config, operation }, client);
    } catch (err) {
      return handleError(err);
    }
  },
};
