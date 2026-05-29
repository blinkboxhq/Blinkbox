export default {
  backendType: "netlify",
  label: "Netlify",
  description: "Deploy, manage sites, and set environment variables via Netlify API",
  fields: [
    { name: "credentialId", label: "Personal Access Token", type: "credential", placeholder: "Netlify PAT", accentColor: "#00ad9f" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "listSites", options: [
      { value: "listSites",    label: "List Sites" },
      { value: "getSite",      label: "Get Site" },
      { value: "triggerDeploy",label: "Trigger Deploy" },
      { value: "getDeploy",    label: "Get Deploy" },
      { value: "cancelDeploy", label: "Cancel Deploy" },
      { value: "lockDeploy",   label: "Lock / Unlock Deploy" },
      { value: "updateEnvVar", label: "Update Env Var" },
      { value: "deleteEnvVar", label: "Delete Env Var" },
    ]},
    { name: "siteId", label: "Site ID", type: "string", smart: true, placeholder: "abc123", show: { operation: ["getSite","triggerDeploy","getDeploy","cancelDeploy","lockDeploy","updateEnvVar","deleteEnvVar"] } },
    { name: "deployId", label: "Deploy ID", type: "string", smart: true, placeholder: "abc123deploy", show: { operation: ["getDeploy","cancelDeploy","lockDeploy"] } },
    { name: "lockAction", label: "Action", type: "options", cols: 2, default: "lock", options: [
      { value: "lock",   label: "Lock" },
      { value: "unlock", label: "Unlock" },
    ], show: { operation: "lockDeploy" } },
    { name: "key", label: "Variable Key", type: "string", smart: true, mono: true, placeholder: "API_URL", show: { operation: ["updateEnvVar","deleteEnvVar"] } },
    { name: "value", label: "Variable Value", type: "string", smart: true, show: { operation: "updateEnvVar" } },
    { name: "context", label: "Deploy Context", type: "options", cols: 3, default: "production", options: [
      { value: "production",      label: "Production" },
      { value: "deploy-preview",  label: "Preview" },
      { value: "branch-deploy",   label: "Branch" },
    ], show: { operation: "updateEnvVar" } },
  ],
  outputs: ["site", "sites", "deploy", "envVar"],
};
