import { resolveCredential } from "./resolveCredential.js";
import { decrypt } from "./crypto.js";

/**
 * Resolves a webhook/HMAC secret for a trigger node. Prefers the new
 * credential-picker field (config.webhookSecretCredentialId), falling back to a
 * legacy inline literal (config.webhookSecret) for automations saved before the
 * picker existed. Returns "" when no secret is configured (verification skipped).
 */
export async function resolveTriggerSecret(config, context, label) {
  const credentialId = config?.webhookSecretCredentialId;
  const workspaceId = context?.workspaceId || config?.workspaceId;
  if (credentialId && workspaceId) {
    const cred = await resolveCredential(credentialId, workspaceId, label);
    return decrypt(cred.encryptedData, cred.iv, cred.authTag);
  }
  return config?.webhookSecret || "";
}
