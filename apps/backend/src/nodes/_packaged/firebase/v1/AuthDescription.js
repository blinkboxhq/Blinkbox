/**
 * FIREBASE — Auth resource. getUser / createUser / deleteUser preserved
 * verbatim from the monolith; updateUser, listUsers, setCustomClaims and
 * createCustomToken added for parity. Handlers receive (config, { auth }).
 */
import { parseJson, num } from "../GenericFunctions.js";

function mapUser(u) {
  return { uid: u.uid, email: u.email, displayName: u.displayName, disabled: u.disabled, metadata: u.metadata };
}

async function opGetUser(config, { auth }) {
  const { userId, email } = config;
  if (!userId && !email) return { success: false, error: "Firebase: 'userId' or 'email' is required.", skipped: true };
  const user = userId ? await auth.getUser(userId) : await auth.getUserByEmail(email);
  return { user: mapUser(user) };
}

async function opCreateUser(config, { auth }) {
  const { email, password, displayName } = config;
  if (!email) return { success: false, error: "Firebase: 'email' is required.", skipped: true };
  const user = await auth.createUser({ email, password, displayName });
  return { uid: user.uid, email: user.email, displayName: user.displayName, created: true };
}

async function opDeleteUser(config, { auth }) {
  const { userId } = config;
  if (!userId) return { success: false, error: "Firebase: 'userId' is required.", skipped: true };
  await auth.deleteUser(userId);
  return { deleted: true, userId };
}

async function opUpdateUser(config, { auth }) {
  const { userId } = config;
  if (!userId) return { success: false, error: "Firebase updateUser: 'userId' is required.", skipped: true };
  const patch = {};
  if (config.email !== undefined) patch.email = config.email;
  if (config.password !== undefined) patch.password = config.password;
  if (config.displayName !== undefined) patch.displayName = config.displayName;
  if (config.disabled !== undefined) patch.disabled = config.disabled === true;
  if (config.phoneNumber !== undefined) patch.phoneNumber = config.phoneNumber;
  if (!Object.keys(patch).length) return { success: false, error: "Firebase updateUser: provide at least one field to update.", skipped: true };
  const user = await auth.updateUser(userId, patch);
  return { updated: true, user: mapUser(user) };
}

async function opListUsers(config, { auth }) {
  const res = await auth.listUsers(num(config.limit, 100), config.pageToken || undefined);
  return { users: res.users.map(mapUser), count: res.users.length, pageToken: res.pageToken ?? null };
}

async function opSetCustomClaims(config, { auth }) {
  const { userId } = config;
  if (!userId) return { success: false, error: "Firebase setCustomClaims: 'userId' is required.", skipped: true };
  const claims = parseJson(config.claims, "claims");
  await auth.setCustomUserClaims(userId, claims);
  return { updated: true, userId, claims };
}

async function opCreateCustomToken(config, { auth }) {
  const { userId } = config;
  if (!userId) return { success: false, error: "Firebase createCustomToken: 'userId' is required.", skipped: true };
  const claims = config.claims ? parseJson(config.claims, "claims") : undefined;
  const token = await auth.createCustomToken(userId, claims);
  return { token, userId };
}

export const authOperations = {
  getUser: opGetUser,
  createUser: opCreateUser,
  deleteUser: opDeleteUser,
  updateUser: opUpdateUser,
  listUsers: opListUsers,
  setCustomClaims: opSetCustomClaims,
  createCustomToken: opCreateCustomToken,
};
