/**
 * FIREBASE NODE (Admin SDK)
 * Operations: getDocument, setDocument, updateDocument, deleteDocument,
 *             queryCollection, addDocument, getUser, createUser, deleteUser,
 *             sendNotification
 * Auth: Firebase service account JSON stored in vault
 */


const apps = new Map();

async function getFirebase(credentialId, workspaceId) {
  const admin = (await import("firebase-admin")).default;

  const raw = await getOAuthToken(credentialId, workspaceId, "Firebase");

  let serviceAccount;
  try { serviceAccount = JSON.parse(raw); }
  catch { throw new Error("Firebase: Credential must be a service account JSON."); }

  const key = credentialId;
  if (apps.has(key)) return apps.get(key);

  const app = admin.apps.find(a => a?.name === key) ||
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: serviceAccount.databaseURL,
    }, key);

  const db  = admin.firestore(app);
  const auth = admin.auth(app);
  const msg  = admin.messaging(app);
  const instance = { db, auth, messaging: msg };
  apps.set(key, instance);
  return instance;
}

function parseJson(val, label) {
  if (typeof val === "object" && val !== null) return val;
  if (!val || val === "") return {};
  try { return JSON.parse(val); }
  catch { throw new Error(`Firebase: Invalid JSON for '${label}'.`); }
}

function handleError(err) {
  const msg = err?.message ?? String(err);
  if (msg.includes("PERMISSION_DENIED")) throw new Error("Firebase: Permission denied. Check Firestore rules or service account.");
  if (msg.includes("NOT_FOUND")) throw new Error(`Firebase: Document or collection not found — ${msg}`);
  if (msg.includes("INVALID_ARGUMENT")) throw new Error(`Firebase: Invalid argument — ${msg}`);
  if (msg.startsWith("Firebase:")) throw err;
  throw new Error(`Firebase: ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const {
      operation = "getDocument",
      collection, docId, data, updateData,
      field, operator = "==", filterValue,
      orderBy, orderDir = "asc", limit = 100,
      userId, email, password, displayName, fcmToken, notification,
    } = config;

    let firebase;
    try {
      firebase = await getFirebase(config.credentialId, context.workspaceId);
    } catch (err) {
      handleError(err);
    }

    const { db, auth, messaging } = firebase;

    try {
      // ── Firestore ────────────────────────────────────────────────────
      if (operation === "getDocument") {
        if (!collection || !docId) return { success: false, error: "Firebase: 'collection' and 'docId' are required.", skipped: true };
        const snap = await db.collection(collection).doc(docId).get();
        return { document: snap.exists ? { id: snap.id, ...snap.data() } : null, found: snap.exists, collection, docId };
      }

      if (operation === "setDocument") {
        if (!collection || !docId) return { success: false, error: "Firebase: 'collection' and 'docId' are required.", skipped: true };
        const payload = parseJson(data, "data");
        await db.collection(collection).doc(docId).set(payload, { merge: config.merge === true });
        return { set: true, collection, docId };
      }

      if (operation === "addDocument") {
        if (!collection) return { success: false, error: "Firebase: 'collection' is required.", skipped: true };
        const payload = parseJson(data, "data");
        const ref = await db.collection(collection).add(payload);
        return { docId: ref.id, collection, added: true };
      }

      if (operation === "updateDocument") {
        if (!collection || !docId) return { success: false, error: "Firebase: 'collection' and 'docId' are required.", skipped: true };
        const payload = parseJson(updateData ?? data, "updateData");
        await db.collection(collection).doc(docId).update(payload);
        return { updated: true, collection, docId };
      }

      if (operation === "deleteDocument") {
        if (!collection || !docId) return { success: false, error: "Firebase: 'collection' and 'docId' are required.", skipped: true };
        await db.collection(collection).doc(docId).delete();
        return { deleted: true, collection, docId };
      }

      if (operation === "queryCollection") {
        if (!collection) return { success: false, error: "Firebase: 'collection' is required.", skipped: true };
        let q = db.collection(collection);
        if (field && filterValue !== undefined) q = q.where(field, operator, filterValue);
        if (orderBy) q = q.orderBy(orderBy, orderDir);
        q = q.limit(Number(limit));
        const snap = await q.get();
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return { documents: docs, count: docs.length, collection };
      }

      // ── Auth ─────────────────────────────────────────────────────────
      if (operation === "getUser") {
        if (!userId && !email) return { success: false, error: "Firebase: 'userId' or 'email' is required.", skipped: true };
        const user = userId ? await auth.getUser(userId) : await auth.getUserByEmail(email);
        return { user: { uid: user.uid, email: user.email, displayName: user.displayName, disabled: user.disabled, metadata: user.metadata } };
      }

      if (operation === "createUser") {
        if (!email) return { success: false, error: "Firebase: 'email' is required.", skipped: true };
        const user = await auth.createUser({ email, password, displayName });
        return { uid: user.uid, email: user.email, displayName: user.displayName, created: true };
      }

      if (operation === "deleteUser") {
        if (!userId) return { success: false, error: "Firebase: 'userId' is required.", skipped: true };
        await auth.deleteUser(userId);
        return { deleted: true, userId };
      }

      // ── Push Notifications ────────────────────────────────────────────
      if (operation === "sendNotification") {
        if (!fcmToken) return { success: false, error: "Firebase: 'fcmToken' is required.", skipped: true };
        const notif = parseJson(notification, "notification");
        const messageId = await messaging.send({ token: fcmToken, notification: notif });
        return { messageId, sent: true, fcmToken };
      }

      throw new Error(`Firebase: Unknown operation '${operation}'.`);
    } catch (err) {
      handleError(err);
    }
  },
};
