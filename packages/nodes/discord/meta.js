export default {
  backendType: "discord",
  label: "Discord",
  description: "Send messages, rich embeds, and files to Discord channels via a bot or webhook.",
  fields: [
    { name: "credentialId", label: "Bot Token", type: "credential", accentColor: "#5865F2" },
    { name: "operation", label: "Operation", type: "options", cols: 3, default: "sendMessage", options: [
      { value: "sendMessage", label: "Send Message" },
      { value: "sendEmbed",   label: "Send Embed" },
      { value: "sendFile",    label: "Send File" },
    ]},
    { name: "channelId", label: "Channel ID", type: "string", smart: true, placeholder: "1234567890123456789", show: { operation: ["sendMessage","sendEmbed","sendFile"] } },
    { name: "content", label: "Message Content", type: "string", smart: true, multiline: true, show: { operation: "sendMessage" } },
    { name: "title", label: "Title", type: "string", smart: true, show: { operation: "sendEmbed" } },
    { name: "description", label: "Description", type: "string", smart: true, multiline: true, show: { operation: "sendEmbed" } },
    { name: "color", label: "Embed Color", type: "string", default: "#5865F2", show: { operation: "sendEmbed" } },
    { name: "url", label: "URL (optional)", type: "string", smart: true, show: { operation: "sendEmbed" } },
    { name: "footer", label: "Footer (optional)", type: "string", smart: true, show: { operation: "sendEmbed" } },
    { name: "fileUrl", label: "File URL", type: "string", smart: true, show: { operation: "sendFile" } },
    { name: "filename", label: "Filename", type: "string", smart: true, placeholder: "report.pdf", show: { operation: "sendFile" } },
    { name: "message", label: "Message (optional)", type: "string", smart: true, show: { operation: "sendFile" } },
  ],
  outputs: ["message"],
};
