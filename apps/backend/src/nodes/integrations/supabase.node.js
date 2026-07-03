/**
 * SUPABASE NODE — slim entry. Resolves the JSON { url, key } credential, builds
 * a supabase-js client, then delegates to the modular router under
 * _packaged/supabase/. Handlers receive (config, supabase). Preserves the
 * original node's contract: skip on missing-credential / cred-resolution failure
 * / per-op validation, but THROW on unknown operation (the monolith's final
 * throw), with the original message text.
 */
import { run as runSupabase, DEFAULT_OPERATION } from "../_packaged/supabase/router.js";
import { getClient } from "../_packaged/supabase/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;

    if (!config.credentialId) {
      return { success: false, error: "Supabase: No credential selected — pick a Supabase credential.", skipped: true };
    }

    let supabase;
    try {
      supabase = await getClient(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Supabase: Could not resolve credential — ${e.message}`, skipped: true };
    }

    return runSupabase({ ...config, operation, input }, supabase);
  },
};
