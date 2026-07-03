/**
 * DISCORD ROLE ASSIGN NODE — slim entry. Resolves the Discord Bot Token into a
 * "Bot <token>" client, then delegates op dispatch to the modular router under
 * _packaged/discordRoleAssign/. Preserves the monolith's contract EXACTLY: a
 * missing token THROWS ("discord_role_assign: Discord Bot Token required."),
 * unknown operations THROW double-quoted (with "Use: add, remove"), and per-op
 * validation SKIPS on missing IDs. Folds input?.guildId / userId / roleId into
 * config to keep the monolith's input-fallback behavior. Handlers receive
 * (config, client).
 */
import { getClient, handleError } from "../_packaged/discordRoleAssign/GenericFunctions.js";
import { run as runDiscordRole, DEFAULT_OPERATION } from "../_packaged/discordRoleAssign/router.js";

export default {
  async run(config, input, context) {
    const operation = config.operation || DEFAULT_OPERATION;
    const merged = {
      ...config,
      operation,
      guildId: config.guildId || input?.guildId,
      userId: config.userId || input?.userId,
      roleId: config.roleId || input?.roleId,
    };
    try {
      const client = await getClient(config, { ...context, input });
      return await runDiscordRole(merged, client);
    } catch (err) {
      return handleError(err);
    }
  },
};
