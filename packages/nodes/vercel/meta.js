export default {
  backendType: "vercel",
  label: "Vercel",
  description: "Manage projects, deployments, domains, and environment variables via the Vercel API.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#000000" },
    {
      name: "operation", label: "Operation", type: "options", cols: 2, default: "listProjects",
      options: [
        { value: "listProjects",      label: "List Projects", desc: "List projects in your team or account" },
        { value: "getProject",        label: "Get Project", desc: "Fetch one project's settings" },
        { value: "listDeployments",   label: "List Deployments", desc: "List deployments, newest first" },
        { value: "getDeployment",     label: "Get Deployment", desc: "Fetch one deployment's status and URL" },
        { value: "triggerDeploy",     label: "Trigger Deploy", desc: "Fire a deploy hook URL to rebuild" },
        { value: "createDeployment",  label: "Create Deployment", desc: "Create a deployment from a git ref" },
        { value: "cancelDeploy",      label: "Cancel Deploy", desc: "Cancel a deployment that is still building" },
        { value: "listDomains",       label: "List Domains", desc: "List domains attached to a project" },
        { value: "addDomain",         label: "Add Domain", desc: "Attach a domain to a project" },
        { value: "getEnvVars",        label: "Get Env Vars", desc: "Read a project's environment variables" },
      ],
    },

    { name: "limit", label: "Limit", type: "number", default: 20, show: { operation: ["listProjects"] } },

    { name: "projectId", label: "Project ID", type: "string", smart: true, show: { operation: ["getProject", "listDeployments", "triggerDeploy", "createDeployment", "addDomain", "getEnvVars"] } },

    { name: "limit", label: "Limit", type: "number", default: 20, show: { operation: ["listDeployments"] } },

    { name: "deploymentId", label: "Deployment ID", type: "string", smart: true, show: { operation: ["getDeployment", "cancelDeploy"] } },

    { name: "name", label: "Name", type: "string", smart: true, optional: true, show: { operation: ["triggerDeploy", "createDeployment"] } },
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
