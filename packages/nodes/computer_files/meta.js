export default {
  backendType: "computer_files",
  label: "Computer Files",
  description: "Read, write, list or delete files on your Linux computer.",
  fields: [
    { type: "notice", variant: "info", text: "Runs as root on your Railway Linux computer, with files under /workspace; the backend needs COMPUTER_URL and COMPUTER_TOKEN set." },
    {
      name: "operation", label: "Operation", type: "options", default: "read",
      options: [
        { value: "read", label: "Read File", desc: "Return a file's contents" },
        { value: "write", label: "Write File", desc: "Create a file, or replace its contents" },
        { value: "append", label: "Append to File", desc: "Add content to the end of a file" },
        { value: "list", label: "List Files", desc: "List what is inside a folder" },
        { value: "delete", label: "Delete File", desc: "Remove a file, or a folder with Recursive on" },
      ],
    },
    { name: "path", label: "Path", type: "string", smart: true, required: true, placeholder: "reports/today.txt", hint: "Relative paths resolve under /workspace" },
    { name: "content", label: "Content", type: "string", smart: true, multiline: true, placeholder: "{{ $json.output }}", show: { operation: ["write", "append"] } },
    {
      name: "encoding", label: "Encoding", type: "options", default: "utf8",
      options: [
        { value: "utf8", label: "Text" },
        { value: "base64", label: "Base64" },
      ],
      hint: "Base64 for images and other binary files",
      show: { operation: ["read", "write", "append"] },
    },
    { name: "recursive", label: "Recursive", type: "boolean", default: false, hint: "List: include subfolders. Delete: remove a folder and everything in it", show: { operation: ["list", "delete"] } },
  ],
  outputs: ["success", "operation", "path", "content", "encoding", "sizeBytes", "bytesWritten", "entries", "count", "deleted", "truncated"],
};
