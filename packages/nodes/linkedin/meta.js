export default {
  backendType: "linkedin",
  label: "LinkedIn",
  description: "Post updates, get profile and company data",
  fields: [
    { name: "credentialId", label: "LinkedIn OAuth Credential", type: "credential", accentColor: "blue", placeholder: "Select LinkedIn credential…" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "getProfile", options: [
      { value: "getProfile",     label: "Get My Profile" },
      { value: "sharePost",      label: "Share Post" },
      { value: "getCompany",     label: "Get Company" },
      { value: "getConnections", label: "Get Connections" },
    ]},
    { name: "text", label: "Post Text", type: "string", smart: true, placeholder: "Share your update...", show: { operation: "sharePost" } },
    { name: "url", label: "Article URL (optional)", type: "string", smart: true, placeholder: "https://example.com/article", show: { operation: "sharePost" } },
    { name: "visibility", label: "Visibility", type: "options", cols: 2, default: "PUBLIC", options: [
      { value: "PUBLIC", label: "Public" },
      { value: "CONNECTIONS", label: "Connections only" },
    ], show: { operation: "sharePost" } },
    { name: "companyId", label: "Company ID", type: "string", smart: true, placeholder: "{{upstream.companyId}}", show: { operation: "getCompany" } },
    { name: "limit", label: "Limit", type: "string", smart: true, placeholder: "50", show: { operation: "getConnections" } },
  ],
};
