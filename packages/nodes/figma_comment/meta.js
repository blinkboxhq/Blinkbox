export default {
  backendType: "figma_comment",
  label: "Figma Comment",
  description: "Post, reply, list, or resolve comments on a Figma file",
  fields: [
    { name: "apiToken", label: "Figma API Token", type: "credential", placeholder: "Figma personal access token", accentColor: "#f24e1e" },
    { name: "mode", label: "Action", type: "options", cols: 2, default: "list", options: [
      { value: "post",    label: "Post Comment" },
      { value: "reply",   label: "Reply to Comment" },
      { value: "list",    label: "List Comments" },
      { value: "resolve", label: "Resolve Comment" },
    ]},
    { name: "fileKey", label: "File Key", type: "string", smart: true, placeholder: "abc123XYZ (from file URL)" },
    { name: "commentId", label: "Comment ID", type: "string", smart: true, placeholder: "123456", show: { mode: ["reply","resolve"] } },
    { name: "message", label: "Message", type: "string", smart: true, multiline: true, placeholder: "Looks good!", show: { mode: ["post","reply"] } },
    { name: "nodeId", label: "Node ID (optional)", type: "string", smart: true, placeholder: "1:23", show: { mode: "post" } },
    { type: "row", show: { mode: "post" }, fields: [
      { name: "x", label: "X offset", type: "number", default: 0 },
      { name: "y", label: "Y offset", type: "number", default: 0 },
    ]},
  ],
  outputs: ["comment", "comments", "resolved"],
};
