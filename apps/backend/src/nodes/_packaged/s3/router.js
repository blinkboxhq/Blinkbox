/**
 * S3 — operation router. Spreads object + bucket operation maps into a single
 * OPERATIONS registry, then dispatches `run(config, ctx)` → handler, funneling
 * errors to handleError. Throws on unknown op internally; the slim entry
 * translates missing-op / missing-credential / missing-bucket into skip objects
 * and resolves the AWS credential + signing context before calling run.
 */
import { handleError } from "./GenericFunctions.js";
import { objectOperations } from "./v1/ObjectDescription.js";
import { bucketOperations } from "./v1/BucketDescription.js";

export const OPERATIONS = {
  ...objectOperations,
  ...bucketOperations,
};

export const DEFAULT_OPERATION = "listObjects";

/** Ops that operate on the service root and therefore do NOT require a bucket. */
export const BUCKETLESS_OPS = new Set(["listBuckets"]);

export async function run(config, ctx) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`S3: Unknown operation "${operation}".`);
  try {
    return await handler(config, ctx);
  } catch (err) {
    handleError(err);
  }
}
