/**
 * SUPABASE — RPC & Auth resources. rpc / getUser preserved verbatim from the
 * monolith; listUsers, createUser, deleteUser and inviteUser added for parity
 * (Admin API — requires a service_role key credential). Handlers receive
 * (config, supabase).
 */
import { parsePayload } from "../GenericFunctions.js";

async function opRpc(config, supabase) {
  const { rpcFunction } = config;
  if (!rpcFunction) return { success: false, error: "Supabase rpc: 'rpcFunction' is required.", skipped: true };
  const params = parsePayload(config.rpcParams);
  const { data: result, error } = await supabase.rpc(rpcFunction, params ?? {});
  if (error) throw error;
  return { result, function: rpcFunction };
}

async function opGetUser(config, supabase) {
  const { data: { user }, error } = await supabase.auth.getUser(config.accessToken ?? "");
  if (error) throw error;
  return { user };
}

async function opListUsers(config, supabase) {
  const page = Number(config.page) || 1;
  const perPage = Math.min(Number(config.limit) || 50, 1000);
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
  if (error) throw error;
  return { users: data?.users ?? [], count: data?.users?.length ?? 0, page };
}

async function opCreateUser(config, supabase) {
  if (!config.email) return { success: false, error: "Supabase createUser: 'email' is required.", skipped: true };
  const payload = { email: config.email, email_confirm: config.emailConfirm === true };
  if (config.password) payload.password = config.password;
  const metadata = parsePayload(config.userMetadata);
  if (metadata && typeof metadata === "object") payload.user_metadata = metadata;
  const { data, error } = await supabase.auth.admin.createUser(payload);
  if (error) throw error;
  return { user: data?.user, created: true };
}

async function opDeleteUser(config, supabase) {
  if (!config.userId) return { success: false, error: "Supabase deleteUser: 'userId' is required.", skipped: true };
  const { data, error } = await supabase.auth.admin.deleteUser(config.userId);
  if (error) throw error;
  return { user: data?.user, deleted: true, userId: config.userId };
}

async function opInviteUser(config, supabase) {
  if (!config.email) return { success: false, error: "Supabase inviteUser: 'email' is required.", skipped: true };
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(config.email, config.redirectTo ? { redirectTo: config.redirectTo } : undefined);
  if (error) throw error;
  return { user: data?.user, invited: true };
}

export const rpcAuthOperations = {
  rpc: opRpc,
  getUser: opGetUser,
  listUsers: opListUsers,
  createUser: opCreateUser,
  deleteUser: opDeleteUser,
  inviteUser: opInviteUser,
};
