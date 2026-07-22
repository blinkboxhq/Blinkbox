export default {
  backendType: "netlify",
  label: "Netlify",
  description: "Deploy and manage Netlify sites, builds, environment variables, and serverless functions.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#00C7B7" },
    {
      name: "operation", label: "Operation", type: "options", cols: 2, default: "listSites",
      options: [
        { value: "listSites",     label: "List Sites", desc: "List sites in your account" },
        { value: "getSite",       label: "Get Site", desc: "Fetch one site's settings and URL" },
        { value: "triggerBuild",  label: "Trigger Build", desc: "Start a new build from the current branch" },
        { value: "triggerDeploy", label: "Trigger Deploy", desc: "Fire a build hook URL to redeploy" },
        { value: "createDeploy",  label: "Create Deploy", desc: "Create a deploy from uploaded files" },
        { value: "listDeploys",   label: "List Deploys", desc: "List deploys for a site, newest first" },
        { value: "getDeploy",     label: "Get Deploy", desc: "Fetch one deploy's status and log URL" },
        { value: "cancelDeploy",  label: "Cancel Deploy", desc: "Cancel a deploy that is still running" },
        { value: "lockDeploy",    label: "Lock Deploy", desc: "Pin a deploy so new builds stop publishing" },
        { value: "updateEnvVar",  label: "Update Env Var", desc: "Set or overwrite an environment variable" },
        { value: "deleteEnvVar",  label: "Delete Env Var", desc: "Remove an environment variable" },
        { value: "listFunctions", label: "List Functions", desc: "List the site's serverless functions" },
      ],
    },

    { name: "limit", label: "Limit", type: "number", default: 20, show: { operation: ["listSites"] } },

    { name: "siteId", label: "Site ID", type: "string", smart: true, show: { operation: ["getSite", "triggerBuild", "triggerDeploy", "createDeploy", "listDeploys", "updateEnvVar", "deleteEnvVar", "listFunctions"] } },

    { name: "branch", label: "Branch", type: "string", smart: true, optional: true, default: "main", show: { operation: ["triggerBuild", "triggerDeploy", "createDeploy"] } },

    { name: "limit", label: "Limit", type: "number", default: 20, show: { operation: ["listDeploys"] } },

    { name: "deployId", label: "Deploy ID", type: "string", smart: true, show: { operation: ["getDeploy", "cancelDeploy", "lockDeploy"] } },

    { name: "key", label: "Variable Key", type: "string", smart: true, placeholder: "MY_SECRET", show: { operation: ["updateEnvVar", "deleteEnvVar"] } },
    { name: "value", label: "Variable Value", type: "string", smart: true, show: { operation: ["updateEnvVar"] } },
  ],
  outputs: ["site", "sites", "deploy", "deploys", "functions"],
};
