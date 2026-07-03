/**
 * GOOGLE FORMS NODE — slim entry. Resolves the Google OAuth access token into a
 * Bearer client, then delegates op dispatch to the modular router under
 * _packaged/googleForms/. Preserves the monolith's contract EXACTLY: a missing
 * token THROWS ("google_forms: Google OAuth access token required."), a missing
 * formId SKIPS (after the token check), unknown operations THROW double-quoted,
 * per-op validation SKIPS. Handlers receive (config, client).
 */
import { getClient, handleError } from "../_packaged/googleForms/GenericFunctions.js";
import { run as runGoogleForms, DEFAULT_OPERATION } from "../_packaged/googleForms/router.js";

export default {
  async run(config, input, context) {
    const operation = config.operation || DEFAULT_OPERATION;
    const formId = config.formId || input?.formId;
    try {
      const client = await getClient(config, { ...context, input });
      if (!formId) return { success: false, error: "google_forms: 'formId' is required.", skipped: true };
      return await runGoogleForms({ ...config, operation, formId }, client);
    } catch (err) {
      return handleError(err);
    }
  },
};
