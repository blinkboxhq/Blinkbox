export default {
  backendType: "docker",
  label: "Docker",
  description: "Manage Docker containers and images via the Docker Engine API or remote socket.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#2496ED" },
    { name: "host", label: "Docker Host", type: "string", smart: false, placeholder: "unix:///var/run/docker.sock or tcp://host:2375" },
    {
      name: "operation", label: "Operation", type: "options", cols: 2, default: "listContainers",
      options: [
        { value: "listContainers",      label: "List Containers" },
        { value: "startContainer",      label: "Start Container" },
        { value: "stopContainer",       label: "Stop Container" },
        { value: "restartContainer",    label: "Restart Container" },
        { value: "removeContainer",     label: "Remove Container" },
        { value: "runContainer",        label: "Run Container" },
        { value: "listImages",          label: "List Images" },
        { value: "pullImage",           label: "Pull Image" },
        { value: "removeImage",         label: "Remove Image" },
        { value: "getContainerLogs",    label: "Get Logs" },
        { value: "inspectContainer",    label: "Inspect Container" },
      ],
    },

    { name: "all", label: "Include Stopped", type: "boolean", default: false, hint: "Include stopped containers", show: { operation: ["listContainers"] } },

    { name: "containerId", label: "Container ID", type: "string", smart: true, show: { operation: ["startContainer", "stopContainer", "restartContainer", "removeContainer", "getContainerLogs", "inspectContainer"] } },

    { name: "tail", label: "Tail Lines", type: "number", default: 100, show: { operation: ["getContainerLogs"] } },
    { name: "timestamps", label: "Show Timestamps", type: "boolean", default: false, show: { operation: ["getContainerLogs"] } },

    { name: "image", label: "Image", type: "string", smart: true, placeholder: "nginx:latest", show: { operation: ["runContainer", "pullImage"] } },
    { name: "containerName", label: "Name", type: "string", smart: true, optional: true, show: { operation: ["runContainer"] } },
    { name: "cmd", label: "Command Override", type: "string", smart: true, optional: true, hint: "Override command", show: { operation: ["runContainer"] } },
    { name: "env", label: "Environment Variables", type: "string", smart: true, multiline: true, optional: true, hint: "KEY=VALUE per line", show: { operation: ["runContainer"] } },
    { name: "ports", label: "Port Mappings", type: "string", smart: true, optional: true, hint: "hostPort:containerPort per line", show: { operation: ["runContainer"] } },
    { name: "detach", label: "Detach", type: "boolean", default: true, show: { operation: ["runContainer"] } },
    { name: "removeOnExit", label: "Remove on Exit", type: "boolean", default: false, show: { operation: ["runContainer"] } },

    { name: "allImages", label: "Include Intermediate", type: "boolean", default: false, show: { operation: ["listImages"] } },

    { name: "imageId", label: "Image ID", type: "string", smart: true, show: { operation: ["removeImage"] } },
  ],
  outputs: ["containers", "container", "images", "image", "logs", "id"],
};
