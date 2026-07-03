/**
 * S3 NODE — slim entry. Resolves AWS credentials (vaulted JSON credential OR
 * inline accessKeyId/secretAccessKey), applies the op-name aliases, computes the
 * SigV4 signing context, then delegates to the modular router under
 * _packaged/s3/. Handlers receive (config, ctx) where
 * ctx = { accessKey, secretKey, region, bucket, base, customEndpoint, input }.
 * Preserves the original node's skip-on-unknown-op / skip-on-missing-credential
 * / skip-on-missing-bucket contract with the original message text.
 *
 * Auth: AWS access key + secret (SigV4). Credential holds a JSON blob
 * { accessKeyId, secretAccessKey, region } in the vault, or inline config keys.
 */
import { run as runS3, DEFAULT_OPERATION, OPERATIONS, BUCKETLESS_OPS } from "../_packaged/s3/router.js";
import { OP_ALIAS, resolveCreds, bucketBase } from "../_packaged/s3/GenericFunctions.js";

export default {
  async run(config, input, context = {}) {
    const operation = OP_ALIAS[config.operation] || config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[operation]) return { success: false, error: `S3: Unknown operation "${operation}".`, skipped: true };

    const bucket = config.bucket || input?.bucket || "";

    if (!config.credentialId && !config.accessKeyId) {
      return { success: false, error: "S3: No credential selected.", skipped: true };
    }

    const creds = await resolveCreds(config, context);
    if (creds.skipped) return { success: false, error: creds.error, skipped: true };

    if (!bucket && !BUCKETLESS_OPS.has(operation)) {
      return { success: false, error: "S3: 'bucket' is required.", skipped: true };
    }

    const customEndpoint = config.endpoint ? config.endpoint.replace(/\/$/, "") : null;
    const base = bucket ? bucketBase(bucket, creds.region, customEndpoint) : null;

    const ctx = {
      accessKey: creds.accessKey,
      secretKey: creds.secretKey,
      region: creds.region,
      bucket,
      base,
      customEndpoint,
      input,
    };
    return runS3({ ...config, operation }, ctx);
  },
};
