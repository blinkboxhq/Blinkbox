/**
 * FIREBASE — shared primitives. Resolves the service-account JSON credential,
 * lazily initialises (and caches) a firebase-admin app per credential, exposes
 * { db, auth, messaging }, plus the JSON parser and verbatim error mapper.
 * Handlers receive (config, { db, auth, messaging }).
 *
 * The app cache is module-level here (not in the slim entry) so initialised
 * apps persist across executions.
 */
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

const apps = new Map();

export async function getFirebase(credentialId, workspaceId) {
  const admin = (await import("firebase-admin")).default;

  const raw = await getOAuthToken(credentialId, workspaceId, "Firebase");

  let serviceAccount;
  try { serviceAccount = JSON.parse(raw); }
  catch { throw new Error("Firebase: Credential must be a service account JSON."); }

  const key = credentialId;
  if (apps.has(key)) return apps.get(key);

  const app = admin.apps.find((a) => a?.name === key) ||
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: serviceAccount.databaseURL,
    }, key);

  const instance = { db: admin.firestore(app), auth: admin.auth(app), messaging: admin.messaging(app) };
  apps.set(key, instance);
  return instance;
}

export function parseJson(val, label) {
  if (typeof val === "object" && val !== null) return val;
  if (!val || val === "") return {};
  try { return JSON.parse(val); }
  catch { throw new Error(`Firebase: Invalid JSON for '${label}'.`); }
}

export function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function handleError(err) {
  const msg = err?.message ?? String(err);
  if (msg.includes("PERMISSION_DENIED")) throw new Error("Firebase: Permission denied. Check Firestore rules or service account.");
  if (msg.includes("NOT_FOUND")) throw new Error(`Firebase: Document or collection not found — ${msg}`);
  if (msg.includes("INVALID_ARGUMENT")) throw new Error(`Firebase: Invalid argument — ${msg}`);
  if (msg.startsWith("Firebase:")) throw err;
  throw new Error(`Firebase: ${msg}`);
}
