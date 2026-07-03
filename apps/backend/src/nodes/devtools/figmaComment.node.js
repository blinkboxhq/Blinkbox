/**
 * FIGMA COMMENT NODE — slim entry. Resolves the Figma PAT into a client, then
 * delegates comment dispatch (keyed on `mode`) to the modular commentRouter
 * under _packaged/figma/. Preserves the monolith's contract EXACTLY: a missing
 * token THROWS ("figma_comment: … required."), a missing `fileKey` SKIPS (after
 * the token check), an unknown mode THROWS double-quoted. Handlers receive
 * (config, client).
 */
import { getClient, makeHandleError } from "../_packaged/figma/GenericFunctions.js";
import { run as runComment, DEFAULT_MODE } from "../_packaged/figma/commentRouter.js";

const handleError = makeHandleError("figma_comment:");

export default {
  async run(config, input, context) {
    const mode = config.mode || DEFAULT_MODE;
    const fileKey = config.fileKey || input?.fileKey;
    const message = config.message || input?.message;
    try {
      const client = await getClient(config, context, "figma_comment:");
      if (!fileKey) return { success: false, error: "figma_comment: 'fileKey' is required.", skipped: true };
      return await runComment({ ...config, mode, fileKey, message }, client);
    } catch (err) {
      return handleError(err);
    }
  },
};
