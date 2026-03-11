import mongoose from "mongoose";

const CredentialSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["bearer", "api_key", "basic"],
      required: true,
    },

    // The locked vault
    encryptedData: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
  },
  { timestamps: true },
);

export default mongoose.model("Credential", CredentialSchema);
