import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    // sha256 of the raw key — the raw key is never stored
    hashedKey: { type: String, required: true, unique: true },
    // first chars of the raw key, safe to display so users can tell keys apart
    prefix: { type: String, required: true },
    label: { type: String, default: "Chatbot connector", maxlength: 100 },
    scope: { type: String, enum: ["mcp", "selfhost"], default: "mcp", index: true },
    lastUsedAt: { type: Date, default: null },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const ApiKey = mongoose.models.ApiKey || mongoose.model("ApiKey", apiKeySchema);
export default ApiKey;
