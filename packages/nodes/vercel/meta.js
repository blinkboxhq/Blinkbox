export default {
  backendType: "vercel",
  label: "Vercel",
  description: "Manage projects, deployments, domains, and environment variables via the Vercel API.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#000000" },
    {
      name: "operation", label: "Operation", type: "options", cols: 2, default: "listProjects",
      options: [
        { value: "listProjects",      label: "List Projects" },
        { value: "getProject",        label: "Get Project" },
        { value: "listDeployments",   label: "List Deployments" },
        { value: "getDeployment",     label: "Get Deployment" },
        { value: "triggerDeploy",     label: "Trigger Deploy" },
        { value: "createDeployment",  label: "Create Deployment" },
        { value: "cancelDeploy",      label: "Cancel Deploy" },
        { value: "listDomains",       label: "List Domains" },
        { value: "addDomain",         label: "Add Domain" },
        { value: "getEnvVars",        label: "Get Env Vars" },
      ],
    },

    { name: "listLimit", label: "Limit", type: "number", default: 20, show: { operation: ["listProjects"] } },

    { name: "projectId", label: "Project ID", type: "string", smart: true, show: { operation: ["getProject", "listDeployments", "triggerDeploy", "createDeployment", "addDomain", "getEnvVars"] } },

    { name: "deploymentsLimit", label: "Limit", type: "number", default: 20, show: { operation: ["listDeployments"] } },

    { name: "deploymentId", label: "Deployment ID", type: "string", smart: true, show: { operation: ["getDeployment", "cancelDeploy"] } },

    { name: "deployName", label: "Name", type: "string", smart: true, optional: true, show: { operation: ["triggerDeploy", "createDeployment"] } },
    {
      name: "target", label: "Target", type: "options", cols: 2, default: "production",
      options: [
        { value: "production", label: "Production" },
        { value: "preview",    label: "Preview" },
      ],
      show: { operation: ["triggerDeploy", "createDeployment"] },
    },
    { name: "gitBranch", label: "Git Branch", type: "string", smart: true, optional: true, default: "main", show: { operation: ["triggerDeploy", "createDeployment"] } },

    { name: "domain", label: "Domain", type: "string", smart: true, placeholder: "yourdomain.com", show: { operation: ["addDomain"] } },

    { name: "teamId", label: "Team ID", type: "string", smart: true, optional: true, show: { operation: ["listProjects", "listDeployments", "triggerDeploy", "createDeployment", "listDomains", "addDomain", "getEnvVars"] } },
  ],
  outputs: ["project", "projects", "deployment", "deployments", "domain", "envVars"],
};
