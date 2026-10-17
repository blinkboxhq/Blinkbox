// Atlas rejects every write once a cluster passes its storage quota (code
// 8000, "you are over your space quota"); a self-hosted mongod on a full disk
// says "No space left on device". Reads keep working, so login still does.
const FULL_PATTERN = /over your space quota|no space left on device|disk is full|out of disk space/i;

function messagesOf(err, depth = 0) {
  if (!err || depth > 4) return [];
  const out = [err.message, err.errmsg, err.errorResponse?.errmsg];
  for (const w of err.writeErrors || err.result?.writeErrors || []) out.push(w?.errmsg, w?.err?.errmsg);
  return [...out.filter(Boolean), ...messagesOf(err.cause, depth + 1)];
}

export function isDbFullError(err) {
  if (!err) return false;
  if (err.code === 8000 || err.errorResponse?.code === 8000) return true;
  return messagesOf(err).some((m) => FULL_PATTERN.test(String(m)));
}

export const DB_FULL_MESSAGE =
  "Blinkbox is out of storage space right now, so new changes can't be saved. Nothing you already saved is lost. Please try again in a little while.";
export const SIGNUP_DB_FULL_MESSAGE =
  "We can't create new accounts for a few minutes while we free up storage. Nothing was saved, so you can sign up again shortly with the same email.";
