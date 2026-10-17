// Tracks whether MongoDB is refusing writes because it is out of space, so a
// full database turns into a clear 503 instead of scattered 500s, and
// background loops back off instead of re-queuing work that cannot be saved.
//
// The driver's command monitor sees every failed command. Request handlers run
// inside an AsyncLocalStorage context, and the driver emits commandFailed in
// the async context of the operation that issued it, so a failed write marks
// the request that caused it — not whichever request happens to be in flight.
import { AsyncLocalStorage } from "node:async_hooks";
import { isDbFullError, DB_FULL_MESSAGE } from "../utils/dbErrors.js";

const requestContext = new AsyncLocalStorage();

const WRITE_COMMANDS = new Set(["insert", "update", "delete", "findAndModify", "bulkWrite"]);

// After the last failed write, assume the database is still full for this long
// unless a write succeeds first.
const FULL_HOLD_MS = 2 * 60 * 1000;

let fullSince = null;
let lastFullAt = 0;

export function noteDbFailure(err) {
  if (!isDbFullError(err)) return false;
  const store = requestContext.getStore();
  if (store) store.dbFull = true;
  const now = Date.now();
  if (fullSince === null) {
    fullSince = now;
    console.error("[db] MongoDB is refusing writes: storage is full. Saves and runs will fail until space is freed.");
  }
  lastFullAt = now;
  return true;
}

export function noteDbWriteOk() {
  if (fullSince === null) return;
  console.log(`[db] MongoDB accepts writes again (was full for ${Math.round((Date.now() - fullSince) / 1000)}s).`);
  fullSince = null;
}

export function dbIsFull(now = Date.now()) {
  return fullSince !== null && now - lastFullAt < FULL_HOLD_MS;
}

export function requestHitDbFull() {
  return Boolean(requestContext.getStore()?.dbFull);
}

export function attachDbMonitor(client) {
  client.on("commandFailed", (ev) => noteDbFailure(ev.failure));
  client.on("commandSucceeded", (ev) => {
    if (!WRITE_COMMANDS.has(ev.commandName)) return;
    const writeErrors = ev.reply?.writeErrors;
    if (Array.isArray(writeErrors) && writeErrors.some((w) => isDbFullError(w))) {
      noteDbFailure(writeErrors.find((w) => isDbFullError(w)));
      return;
    }
    noteDbWriteOk();
  });
}

// Must be mounted after the body parsers: they resume the request from a
// stream callback, which would run the rest of the chain outside the context.
export function trackDbRequests(_req, _res, next) {
  requestContext.run({ dbFull: false }, next);
}

// Any error a handler sends after one of its writes hit a full database becomes
// the same friendly 503, whatever the handler's own catch block said. 400/422
// are included because some handlers answer a failed save with a 400 carrying
// the raw driver message; auth and not-found answers are left alone.
const REWRITE_STATUSES = new Set([400, 422]);

export function dbFullResponses(_req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if ((res.statusCode >= 500 || REWRITE_STATUSES.has(res.statusCode)) && requestHitDbFull()) {
      res.status(503);
      res.set("Retry-After", "600");
      return originalJson({ success: false, message: DB_FULL_MESSAGE, error: DB_FULL_MESSAGE, code: "DB_FULL" });
    }
    return originalJson(body);
  };
  next();
}

export function runWithDbContext(fn) {
  return requestContext.run({ dbFull: false }, fn);
}
