/**
 * Mastodon — Account resource. Verify credentials (self), get account, follow &
 * unfollow, block & unblock, mute & unmute, list followers/following, and a
 * given account's statuses. Handlers receive { headers, base }.
 */
import { get, post, boundLimit, mapAccount, mapStatus } from "../GenericFunctions.js";

async function opVerifyCredentials(config, client) {
  const data = await get(client, `/accounts/verify_credentials`);
  return mapAccount(data);
}

async function opGetAccount(config, client, input) {
  const id = config.accountId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'accountId' is required.", skipped: true };
  const data = await get(client, `/accounts/${id}`);
  return mapAccount(data);
}

async function opFollowAccount(config, client, input) {
  const id = config.accountId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'accountId' is required.", skipped: true };
  const data = await post(client, `/accounts/${id}/follow`);
  return { following: data.following, accountId: id };
}

async function opUnfollowAccount(config, client, input) {
  const id = config.accountId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'accountId' is required.", skipped: true };
  const data = await post(client, `/accounts/${id}/unfollow`);
  return { following: data.following, accountId: id };
}

async function opBlockAccount(config, client, input) {
  const id = config.accountId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'accountId' is required.", skipped: true };
  const data = await post(client, `/accounts/${id}/block`);
  return { blocking: data.blocking, accountId: id };
}

async function opUnblockAccount(config, client, input) {
  const id = config.accountId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'accountId' is required.", skipped: true };
  const data = await post(client, `/accounts/${id}/unblock`);
  return { blocking: data.blocking, accountId: id };
}

async function opMuteAccount(config, client, input) {
  const id = config.accountId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'accountId' is required.", skipped: true };
  const body = {};
  if (config.notifications != null) body.notifications = config.notifications === true;
  if (config.duration != null) body.duration = Number(config.duration);
  const data = await post(client, `/accounts/${id}/mute`, body);
  return { muting: data.muting, accountId: id };
}

async function opUnmuteAccount(config, client, input) {
  const id = config.accountId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'accountId' is required.", skipped: true };
  const data = await post(client, `/accounts/${id}/unmute`);
  return { muting: data.muting, accountId: id };
}

async function opGetFollowers(config, client, input) {
  const id = config.accountId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'accountId' is required.", skipped: true };
  const data = await get(client, `/accounts/${id}/followers`, { params: { limit: boundLimit(config.limit) } });
  return { accounts: (data || []).map(mapAccount), count: data?.length || 0 };
}

async function opGetFollowing(config, client, input) {
  const id = config.accountId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'accountId' is required.", skipped: true };
  const data = await get(client, `/accounts/${id}/following`, { params: { limit: boundLimit(config.limit) } });
  return { accounts: (data || []).map(mapAccount), count: data?.length || 0 };
}

async function opGetAccountStatuses(config, client, input) {
  const id = config.accountId || input?.id;
  if (!id) return { success: false, error: "mastodon: 'accountId' is required.", skipped: true };
  const params = { limit: boundLimit(config.limit) };
  if (config.excludeReplies != null) params.exclude_replies = config.excludeReplies === true;
  if (config.onlyMedia != null) params.only_media = config.onlyMedia === true;
  if (config.maxId) params.max_id = config.maxId;
  const data = await get(client, `/accounts/${id}/statuses`, { params });
  return { posts: (data || []).map(mapStatus), count: data?.length || 0 };
}

export const accountOperations = {
  verifyCredentials: opVerifyCredentials,
  getAccount: opGetAccount,
  followAccount: opFollowAccount,
  follow: opFollowAccount,
  unfollowAccount: opUnfollowAccount,
  blockAccount: opBlockAccount,
  unblockAccount: opUnblockAccount,
  muteAccount: opMuteAccount,
  unmuteAccount: opUnmuteAccount,
  getFollowers: opGetFollowers,
  getFollowing: opGetFollowing,
  getAccountStatuses: opGetAccountStatuses,
};
