export default {
  backendType: "ssh",
  label: "SSH",
  description: "Execute commands, transfer files, and list directories on remote servers over SSH.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#4A90D9" },
    { name: "host", label: "Host", type: "string", smart: false, placeholder: "192.168.1.100" },
    { name: "port", label: "Port", type: "number", default: 22 },
    { name: "username", label: "Username", type: "string", smart: false, placeholder: "ubuntu" },
    {
      name: "operation", label: "Operation", type: "options", cols: 2, default: "executeCommand",
      options: [
        { value: "executeCommand", label: "Execute Command" },
        { value: "uploadFile",     label: "Upload File" },
        { value: "downloadFile",   label: "Download File" },
        { value: "listFiles",      label: "List Files" },
      ],
    },

    { name: "command", label: "Command", type: "string", smart: true, multiline: true, placeholder: "ls -la /home", show: { operation: ["executeCommand"] } },
    { name: "timeout", label: "Timeout (ms)", type: "number", default: 30000, show: { operation: ["executeCommand"] } },

    { name: "localPath", label: "Local Path", type: "string", smart: true, placeholder: "/tmp/file.txt", show: { operation: ["uploadFile"] } },
    { name: "remotePath", label: "Remote Path", type: "string", smart: true, placeholder: "/home/ubuntu/file.txt", show: { operation: ["uploadFile", "downloadFile", "listFiles"] } },

    { name: "downloadRemotePath", label: "Remote Path", type: "string", smart: true, show: { operation: ["downloadFile"] } },
    { name: "downloadLocalPath", label: "Local Path", type: "string", smart: true, show: { operation: ["downloadFile"] } },

    { name: "listPath", label: "Remote Path", type: "string", smart: true, default: "/home", show: { operation: ["listFiles"] } },
  ],
  outputs: ["output", "stdout", "stderr", "exitCode", "files"],
};
