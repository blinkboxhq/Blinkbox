/**
 * GOOGLE DOCS NODE — slim entry. Resolves the Google OAuth access token into a
 * Bearer client, then delegates op dispatch to the modular router under
 * _packaged/googleDocs/. Preserves the monolith's contract EXACTLY: a missing
 * token THROWS ("google_docs: Google OAuth access token required."), a missing
 * docId SKIPS per-op, unknown operations THROW double-quoted. Handlers receive
 * (config, client). Folds input?.docId / input?.text into config to keep the
 * monolith's input-fallback behavior.
 */
import { getClient, handleError } from "../_packaged/googleDocs/GenericFunctions.js";
import { run as runGoogleDocs, DEFAULT_OPERATION } from "../_packaged/googleDocs/router.js";

export default {
  async run(config, input, context) {
    const operation = config.operation || DEFAULT_OPERATION;
    const merged = {
      ...config,
      operation,
      docId: config.docId || input?.docId,
      text: config.text ?? input?.text,
    };
    try {
      const client = await getClient(config, { ...context, input });
      return await runGoogleDocs(merged, client);
    } catch (err) {
      return handleError(err);
    }
  },
};
