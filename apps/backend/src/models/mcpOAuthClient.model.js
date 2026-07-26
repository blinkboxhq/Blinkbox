import mongoose from "mongoose";

// Persisted record of a dynamically-registered MCP connector (RFC 7591), so
// /oauth/authorize and /oauth/token can confirm a redirect_uri was actually
// declared at registration time instead of trusting whatever the caller sends.
const mcpOAuthClientSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, unique: true, index: true },
    redirectUris: { type: [String], required: true },
    clientName: { type: String, default: "MCP Client", maxlength: 200 },
  },
  { timestamps: true },
);

const McpOAuthClient =
  mongoose.models.McpOAuthClient || mongoose.model("McpOAuthClient", mcpOAuthClientSchema);
export default McpOAuthClient;
