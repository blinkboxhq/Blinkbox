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
        { value: "executeCommand", label: "Execute Command", desc: "Run a shell command and capture its output" },
        { value: "uploadFile",     label: "Upload File", desc: "Write a file to the remote host" },
        { value: "downloadFile",   label: "Download File", desc: "Read a file from the remote host" },
        { value: "listFiles",      label: "List Files", desc: "List the contents of a remote directory" },
      ],
    },

    { name: "command", label: "Command", type: "string", smart: true, multiline: true, placeholder: "ls -la /home", show: { operation: ["executeCommand"] } },
    { name: "timeout", label: "Timeout (ms)", type: "number", default: 30000, show: { operation: ["executeCommand"] } },

    { name: "content", label: "File Content", type: "string", smart: true, multiline: true, placeholder: "{{ $json.data }}", show: { operation: ["uploadFile"] } },
    { name: "remotePath", label: "Remote Path", type: "string", smart: true, placeholder: "/home/ubuntu/file.txt", show: { operation: ["uploadFile", "downloadFile", "listFiles"] } },
  ],
  outputs: ["output", "stdout", "stderr", "exitCode", "files"],
};
