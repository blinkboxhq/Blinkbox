export default {
  backendType: "linkedin",
  label: "LinkedIn",
  description: "Post updates, get profile and company data via LinkedIn API.",
  fields: [
    { name: "credentialId", type: "credential", label: "LinkedIn Credential", accentColor: "#0A66C2" },
    {
      name: "operation", type: "options", label: "Operation", cols: 2, default: "sharePost",
      options: [
        { value: "sharePost",      label: "Share Post" },
        { value: "getProfile",     label: "Get My Profile" },
        { value: "getCompany",     label: "Get Company" },
        { value: "getConnections", label: "Get Connections" },
      ],
    },

    { name: "text", type: "string", label: "Post Text", smart: true, multiline: true, show: { operation: "sharePost" } },
    {
      name: "visibility", type: "options", label: "Visibility", cols: 2, default: "PUBLIC",
      options: [
        { value: "PUBLIC",      label: "Public" },
        { value: "CONNECTIONS", label: "Connections Only" },
      ],
      show: { operation: "sharePost" },
    },
    { name: "imageUrl", type: "string", label: "Image URL", smart: true, optional: true, hint: "URL of image to attach", show: { operation: "sharePost" } },
    { name: "articleUrl", type: "string", label: "Article URL", smart: true, optional: true, hint: "Link to share (article URL)", show: { operation: "sharePost" } },

    { name: "companyId", type: "string", label: "Company ID", smart: true, placeholder: "LinkedIn company ID or vanity name", show: { operation: "getCompany" } },

    { name: "start", type: "number", label: "Start", default: 0, show: { operation: "getConnections" } },
    { name: "count", type: "number", label: "Count", default: 50, show: { operation: "getConnections" } },
  ],
  outputs: ["postId", "profile", "company", "connections"],
};
