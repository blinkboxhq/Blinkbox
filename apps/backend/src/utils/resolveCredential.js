import mongoose from "mongoose";
import Credential from "../models/credential.model.js";

/**
 * Resolves a credential by _id first, falling back to name + workspaceId.
 * Returns the credential document or throws a descriptive error.
 */
export async function resolveCredential(credentialId, workspaceId, nodeLabel) {
  if (!credentialId) {
    throw new Error(
      `${nodeLabel}: 'credentialId' is required. Add your API key to the Vault.`,
    );
  }

  const trimmed = String(credentialId).trim();

  if (!workspaceId) {
    throw new Error(`${nodeLabel}: Cannot resolve credential without a workspace context.`);
  }

  // Try by _id if it looks like a valid ObjectId
  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    const cred = await Credential.findOne({ _id: trimmed, workspaceId });
    if (cred) return cred;
  }

  // Fallback: try by name (case-insensitive, exact match)
  {
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const cred = await Credential.findOne({
      workspaceId,
      name: { $regex: new RegExp(`^${escaped}$`, "i") },
    });
    if (cred) return cred;
  }

  throw new Error(
    `${nodeLabel}: Credential "${trimmed}" not found. ` +
      `Verify the credential exists in your Vault and belongs to this workspace.`,
  );
}
