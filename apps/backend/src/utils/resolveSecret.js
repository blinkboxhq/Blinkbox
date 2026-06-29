import { getOAuthToken } from "./getOAuthToken.js";

/**
 * Resolves a trigger/node secret that may be either a credential-picker id or a
 * legacy inline literal. New automations store a credential `_id` in the field;
 * older ones stored the raw token. We try to decrypt it as a credential and, if
 * that fails (not an id, or no workspace context), fall back to the literal so
 * pre-credential-picker automations keep working.
 *
 * @param {string} value        credential id OR raw secret
 * @param {string} workspaceId  owning workspace (required to look up a credential)
 * @param {string} label        human label for error messages
 * @returns {Promise<string>}   the decrypted/real secret, or the literal value
 */
export async function resolveSecret(value, workspaceId, label) {
  if (!value) return value;
  if (!workspaceId) return value;
  try {
    return await getOAuthToken(value, workspaceId, label);
  } catch {
    return value;
  }
}
