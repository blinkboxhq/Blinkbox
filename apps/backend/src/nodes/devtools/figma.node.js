/**
 * FIGMA NODE — slim entry. Resolves the Figma PAT into a client, then delegates
 * file-op dispatch to the modular router under _packaged/figma/. Preserves the
 * monolith's contract EXACTLY: a missing token THROWS ("figma: … required."),
 * a missing `fileKey` SKIPS (after the token check), unknown operations THROW
 * double-quoted, per-op validation SKIPS. Handlers receive (config, client).
 */
import { getClient, makeHandleError } from "../_packaged/figma/GenericFunctions.js";
import { run as runFigma, DEFAULT_OPERATION } from "../_packaged/figma/router.js";

const handleError = makeHandleError("figma:");

export default {
  async run(config, input, context) {
    const operation = config.operation || DEFAULT_OPERATION;
    const fileKey = config.fileKey || input?.fileKey;
    const nodeId = config.nodeId || input?.nodeId;
    try {
      const client = await getClient(config, context, "figma:");
      if (!fileKey) return { success: false, error: "figma: 'fileKey' is required.", skipped: true };
      return await runFigma({ ...config, operation, fileKey, nodeId }, client);
    } catch (err) {
      return handleError(err);
    }
  },
};
