import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
  async run(config, input, context) {
    const operation = config.operation || "add";
    const guildId = config.guildId || input?.guildId;
    const userId = config.userId || input?.userId;
    const roleId = config.roleId || input?.roleId;
    const token = config.botToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "Discord"));
    if (!token) throw new Error("discord_role_assign: Discord Bot Token required.");
    if (!guildId || !userId || !roleId) return { success: false, error: "discord_role_assign: 'guildId', 'userId', and 'roleId' are required.", skipped: true };

    const headers = { Authorization: `Bot ${token}` };
    const url = `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`;

    if (operation === "add") {
      await axios.put(url, {}, { headers, timeout: 15000 });
      return { userId, roleId, guildId, action: "added" };
    }
    if (operation === "remove") {
      await axios.delete(url, { headers, timeout: 15000 });
      return { userId, roleId, guildId, action: "removed" };
    }
    throw new Error(`discord_role_assign: Unknown operation "${operation}". Use: add, remove`);
  },
};
