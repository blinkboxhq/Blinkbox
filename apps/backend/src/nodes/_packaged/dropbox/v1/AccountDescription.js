/**
 * Dropbox — Account resource. Current account, space usage, and account lookup.
 * These are new parity additions over the monolith (Dropbox v2 /users/*).
 * Handlers receive (config, client).
 */
import { rpc } from "../GenericFunctions.js";

async function opGetCurrentAccount(_config, client) {
  const data = await rpc(client, "/users/get_current_account", null);
  return {
    success: true,
    accountId: data.account_id,
    name: data.name?.display_name,
    email: data.email,
    emailVerified: data.email_verified,
    country: data.country,
    locale: data.locale,
    accountType: data.account_type?.[".tag"],
  };
}

async function opGetSpaceUsage(_config, client) {
  const data = await rpc(client, "/users/get_space_usage", null);
  return {
    success: true,
    used: data.used,
    allocated: data.allocation?.allocated,
    allocationType: data.allocation?.[".tag"],
  };
}

async function opGetAccount(config, client) {
  const { accountId } = config;
  if (!accountId) return { success: false, error: "Dropbox getAccount: 'accountId' is required.", skipped: true };
  const data = await rpc(client, "/users/get_account", { account_id: accountId });
  return {
    success: true,
    accountId: data.account_id,
    name: data.name?.display_name,
    email: data.email,
    accountType: data.account_type?.[".tag"],
  };
}

export const accountOperations = {
  getCurrentAccount: opGetCurrentAccount,
  getSpaceUsage: opGetSpaceUsage,
  getAccount: opGetAccount,
};
