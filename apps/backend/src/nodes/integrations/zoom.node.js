/**
 * ZOOM NODE — slim entry. Resolves the OAuth token, then delegates to the
 * modular router under _packaged/zoom/. Handlers receive (config, token).
 * Preserves the original node's contract EXACTLY: the unknown-operation THROW
 * happens FIRST (listing valid ops), then credential-resolution failure is
 * funneled through handleError (which THROWS — this node has no no-cred skip),
 * and per-op validation returns skip objects.
 */
import { run as runZoom, DEFAULT_OPERATION, OPERATIONS, unknownOperationError } from "../_packaged/zoom/router.js";
import { getToken, handleError } from "../_packaged/zoom/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation]) throw unknownOperationError(operation);

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (err) {
      handleError(err);
    }

    return runZoom({ ...config, operation, input }, token);
  },
};
