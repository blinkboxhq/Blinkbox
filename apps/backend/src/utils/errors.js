/**
 * Error sanitization utilities.
 * Maps internal errors to safe user-facing messages so stack traces,
 * DB internals, and node configs are never leaked to the client.
 */

export const USER_ERRORS = {
  NOT_FOUND: "Resource not found.",
  AUTOMATION_NOT_FOUND: "Automation not found.",
  EXECUTION_FAILED: "Execution failed. Check the trace for details.",
  NODE_TIMEOUT: "A node timed out. Try increasing its timeout in Advanced Settings.",
  WEBHOOK_UNAUTHORIZED: "Webhook signature verification failed.",
  RATE_LIMITED: "Too many requests. Please slow down.",
  CYCLE_DETECTED: "Cycle detected in workflow. Check your connections.",
  INVALID_WORKFLOW: "Workflow has structural issues. Check your node connections.",
  QUOTA_EXCEEDED: "Workspace credit quota exceeded. Upgrade your plan.",
  INTERNAL: "Something went wrong. Our team has been notified.",
};

export function sanitizeError(err) {
  if (!err) return USER_ERRORS.INTERNAL;

  const msg = err.message || String(err);

  // Deterministic pattern matching — ordered from most specific to most generic
  if (/cycle detected/i.test(msg)) return USER_ERRORS.CYCLE_DETECTED;
  if (/not found/i.test(msg) && /automation/i.test(msg)) return USER_ERRORS.AUTOMATION_NOT_FOUND;
  if (/not found/i.test(msg)) return USER_ERRORS.NOT_FOUND;
  if (/timed? ?out|timeout/i.test(msg)) return USER_ERRORS.NODE_TIMEOUT;
  if (/quota|credit|limit exceeded/i.test(msg)) return USER_ERRORS.QUOTA_EXCEEDED;
  if (/signature|hmac|unauthorized/i.test(msg)) return USER_ERRORS.WEBHOOK_UNAUTHORIZED;
  if (/invalid workflow|unreachable|missing entry/i.test(msg)) return USER_ERRORS.INVALID_WORKFLOW;
  if (/rate.?limit|too many/i.test(msg)) return USER_ERRORS.RATE_LIMITED;

  // Sub-workflow cycle has a distinct message — surface it directly (safe, no internals)
  if (/sub.?workflow cycle/i.test(msg)) return msg;

  // Loop iteration limit is a user-facing message
  if (/loop node.*exceed/i.test(msg)) return msg;

  return USER_ERRORS.EXECUTION_FAILED;
}

export function sanitizeAndLog(err, context = "") {
  const safe = sanitizeError(err);
  if (context) {
    console.error(`[${context}]`, err?.message ?? err);
  } else {
    console.error(err?.message ?? err);
  }
  return safe;
}
