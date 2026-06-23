export default {
  backendType: "discord_role_assign",
  label: "Discord Role",
  description: "Add, remove, list, or create roles on a Discord server",
  fields: [
    { name: "credentialId", label: "Bot Token", type: "credential", placeholder: "Discord bot token", accentColor: "#5865f2" },
    { name: "mode", label: "Action", type: "options", cols: 2, default: "add", options: [
      { value: "add",    label: "Add Role" },
      { value: "remove", label: "Remove Role" },
      { value: "list",   label: "List Roles" },
      { value: "create", label: "Create Role" },
    ]},
    { name: "guildId", label: "Server (Guild) ID", type: "string", smart: true, placeholder: "1234567890" },
    { name: "userId", label: "User ID", type: "string", smart: true, placeholder: "9876543210", show: { mode: ["add","remove"] } },
    { name: "roleId", label: "Role ID", type: "string", smart: true, placeholder: "1122334455", show: { mode: ["add","remove"] } },
    { name: "roleName", label: "Role Name", type: "string", smart: true, placeholder: "Moderator", show: { mode: "create" } },
    { name: "roleColor", label: "Role Color (hex)", type: "string", smart: false, placeholder: "#ff0000", show: { mode: "create" } },
    { name: "reason", label: "Audit Log Reason (optional)", type: "string", smart: true, show: { mode: ["add","remove","create"] } },
  ],
  outputs: ["role", "roles", "member"],
};
