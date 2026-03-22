import mongoose from "mongoose";

const CredentialSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["bearer", "api_key", "basic", "oauth"],
      required: true,
    },

    // The locked vault (stores API key / token / OAuth access token)
    encryptedData: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },

    // OAuth-specific fields (only set when type === "oauth")
    provider: { type: String },                    // "slack", "airtable", "meta", etc.
    refreshToken: { type: String },                // Encrypted refresh token (hex)
    refreshIv: { type: String },                   // IV for refresh token
    refreshAuthTag: { type: String },              // Auth tag for refresh token
    tokenExpiresAt: { type: Date },                // When access token expires
    oauthMetadata: { type: mongoose.Schema.Types.Mixed }, // Extra data (team name, workspace, etc.)
  },
  { timestamps: true },
);

export default mongoose.model("Credential", CredentialSchema);
