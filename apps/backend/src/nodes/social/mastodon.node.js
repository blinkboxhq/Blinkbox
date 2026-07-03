/**
 * MASTODON NODE — slim entry. Resolves the per-instance access token (direct
 * config or vaulted "Mastodon" credential), SSRF-guards the user-supplied
 * instance host, then delegates to the modular router under _packaged/mastodon/.
 * Handlers receive a { headers, base } client. Preserves the original node's
 * throw-on-unknown-op / throw-on-missing-token contract.
 *
 * Auth: per-instance access token. The instance host is user-controlled, so the
 * base URL is passed through assertSafeUrlResolved (inside buildClient) before
 * any request.
 */
import { run as runMastodon, DEFAULT_OPERATION } from "../_packaged/mastodon/router.js";
import { getKey, normaliseInstance, buildClient } from "../_packaged/mastodon/GenericFunctions.js";

export default {
  async run(config, input, context) {
    const operation = config.operation || DEFAULT_OPERATION;
    const instance = normaliseInstance(config.instanceUrl || config.instance);

    const token = config.accessToken
      || (config.credentialId && (await getKey(config.credentialId, context?.workspaceId, "Mastodon")));
    if (!token) throw new Error("mastodon: access token required — set a credential.");

    const client = await buildClient(instance, token);
    return runMastodon({ ...config, operation }, client, input);
  },
};
