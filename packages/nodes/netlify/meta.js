export default {
  backendType: "netlify",
  label: "Netlify",
  description: "Deploy and manage Netlify sites, builds, environment variables, and serverless functions.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#00C7B7" },
    {
      name: "operation", label: "Operation", type: "options", cols: 2, default: "listSites",
      options: [
        { value: "listSites",     label: "List Sites" },
        { value: "getSite",       label: "Get Site" },
        { value: "triggerBuild",  label: "Trigger Build" },
        { value: "triggerDeploy", label: "Trigger Deploy" },
        { value: "createDeploy",  label: "Create Deploy" },
        { value: "listDeploys",   label: "List Deploys" },
        { value: "getDeploy",     label: "Get Deploy" },
        { value: "cancelDeploy",  label: "Cancel Deploy" },
        { value: "lockDeploy",    label: "Lock Deploy" },
        { value: "updateEnvVar",  label: "Update Env Var" },
        { value: "deleteEnvVar",  label: "Delete Env Var" },
        { value: "listFunctions", label: "List Functions" },
      ],
    },

    { name: "listLimit", label: "Limit", type: "number", default: 20, show: { operation: ["listSites"] } },

    { name: "siteId", label: "Site ID", type: "string", smart: true, show: { operation: ["getSite", "triggerBuild", "triggerDeploy", "createDeploy", "listDeploys", "updateEnvVar", "deleteEnvVar", "listFunctions"] } },

    { name: "branch", label: "Branch", type: "string", smart: true, optional: true, default: "main", show: { operation: ["triggerBuild", "triggerDeploy", "createDeploy"] } },
    { name: "clearCache", label: "Clear Cache", type: "boolean", default: false, show: { operation: ["triggerBuild", "triggerDeploy", "createDeploy"] } },

    { name: "deploysLimit", label: "Limit", type: "number", default: 20, show: { operation: ["listDeploys"] } },

    { name: "deployId", label: "Deploy ID", type: "string", smart: true, show: { operation: ["getDeploy", "cancelDeploy", "lockDeploy"] } },

    { name: "key", label: "Variable Key", type: "string", smart: true, placeholder: "MY_SECRET", show: { operation: ["updateEnvVar", "deleteEnvVar"] } },
    { name: "value", label: "Variable Value", type: "string", smart: true, show: { operation: ["updateEnvVar"] } },
  ],
  outputs: ["site", "sites", "deploy", "deploys", "functions"],
};
