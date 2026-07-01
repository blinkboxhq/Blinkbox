/**
 * GITHUB NODE — slim entry. Resolves the PAT/App token, enforces the owner/repo
 * gate for repo-scoped ops, then delegates to the modular router in
 * _packaged/github/. 37 operations.
 *
 * Auth: Personal Access Token (PAT) or GitHub App token stored in vault.
 */
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runGitHub, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/github/router.js";
import { NO_REPO_OPS } from "../_packaged/github/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const op = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[op]) return { success: false, error: `GitHub: Unknown operation "${op}".`, skipped: true };

    if (!NO_REPO_OPS.has(op)) {
      if (!config.owner) return { success: false, error: "GitHub: 'owner' (GitHub username or org) is required.", skipped: true };
      if (!config.repo) return { success: false, error: "GitHub: 'repo' is required.", skipped: true };
    }

    if (!config.credentialId) return { success: false, error: "GitHub: No credential selected — pick a GitHub Personal Access Token credential.", skipped: true };

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "GitHub");
    } catch (e) {
      return { success: false, error: `GitHub: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runGitHub(config, token);
  },
};
