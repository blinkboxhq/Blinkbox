/**
 * EMAIL VERIFIER NODE
 * Deterministic lead-quality gate: syntax, role-address, disposable-domain,
 * and MX-record checks. No SMTP probing (unreliable, network-blocked, abuse-adjacent).
 *
 * Config:
 *   arrayPath           — dot-path to the array of lead objects (blank = input.leads/candidates/items/input)
 *   emailField          — field holding the email address (default "email")
 *   rejectRoleAddresses — drop info@/support@/etc (default true)
 *   rejectDisposable    — drop known throwaway-mail domains (default true)
 *   requireMx           — resolve MX records for the domain (default true)
 *   mxTimeoutMs         — per-domain MX lookup timeout (default 5000)
 *
 * Returns: { verified: [...], rejected: [...], verifiedCount, rejectedCount, domainsChecked }
 * Each rejected item carries __rejectReason: invalid_syntax | role_address | disposable_domain | no_mx
 */

import dns from "node:dns/promises";

const ROLE_LOCALPARTS = new Set([
  "info", "support", "noreply", "no-reply", "donotreply", "contact", "hello", "hi",
  "sales", "admin", "team", "help", "office", "billing", "accounts", "careers", "jobs",
  "press", "media", "enquiries", "inquiries", "marketing", "service", "services",
  "mail", "email", "webmaster", "postmaster", "privacy", "legal", "abuse", "security",
  "feedback", "newsletter", "notifications", "alerts", "bot", "daemon", "root", "system",
]);

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "tempmail.com", "guerrillamail.com", "10minutemail.com",
  "throwawaymail.com", "yopmail.com", "trashmail.com", "getnada.com", "dispostable.com",
  "fakeinbox.com", "sharklasers.com", "guerrillamail.info", "maildrop.cc", "mintemail.com",
  "mohmal.com", "moakt.com", "tempinbox.com", "spamgourmet.com", "mailnesia.com",
  "tempmailo.com", "emailondeck.com", "discard.email", "mailcatch.com", "inboxbear.com",
  "burnermail.io", "temp-mail.org", "33mail.com", "mytemp.email", "spam4.me", "tempr.email",
  "mailsac.com", "emailfake.com", "fakemailgenerator.com", "10minutemail.net",
]);

const VALID_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

function getPath(obj, path) {
  if (obj == null) return undefined;
  if (!path) return obj;
  const parts = String(path).replace(/\[(\w+)\]/g, ".$1").split(".").filter(Boolean);
  let acc = obj;
  for (const key of parts) {
    if (acc == null) return undefined;
    acc = acc[key];
  }
  return acc;
}

// Resolved false on timeout rather than rejecting — a slow/unreachable resolver
// shouldn't stall the whole batch; the domain is just treated as unverifiable.
async function hasMx(domain, timeoutMs) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });
  const lookup = (async () => {
    try {
      const records = await dns.resolveMx(domain);
      return Array.isArray(records) && records.length > 0;
    } catch {
      return false;
    }
  })();
  try {
    return await Promise.race([lookup, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export default {
  async run(config = {}, input) {
    const {
      arrayPath = "",
      emailField = "email",
      rejectRoleAddresses = true,
      rejectDisposable = true,
      requireMx = true,
      mxTimeoutMs = 5000,
      outputVerifiedKey = "verified",
      outputRejectedKey = "rejected",
    } = config;

    const src = Array.isArray(arrayPath)
      ? arrayPath
      : arrayPath
        ? getPath(input, arrayPath)
        : input?.leads || input?.candidates || input?.items || input;

    const arr = Array.isArray(src) ? src : src ? [src] : [];

    const verified = [];
    const rejected = [];
    const pending = [];
    const domainNeedsCheck = new Set();

    for (const item of arr) {
      const rawEmail = typeof item === "object" && item !== null ? item[emailField] : item;
      const email = String(rawEmail || "").trim().toLowerCase();

      if (!VALID_EMAIL_RE.test(email)) {
        rejected.push({ ...item, __rejectReason: "invalid_syntax" });
        continue;
      }

      const at = email.lastIndexOf("@");
      const local = email.slice(0, at);
      const domain = email.slice(at + 1);

      if (rejectRoleAddresses && ROLE_LOCALPARTS.has(local)) {
        rejected.push({ ...item, __rejectReason: "role_address" });
        continue;
      }

      if (rejectDisposable && DISPOSABLE_DOMAINS.has(domain)) {
        rejected.push({ ...item, __rejectReason: "disposable_domain" });
        continue;
      }

      if (!requireMx) {
        verified.push(item);
        continue;
      }

      domainNeedsCheck.add(domain);
      pending.push({ item, domain });
    }

    const domainResults = new Map();
    if (requireMx && domainNeedsCheck.size > 0) {
      const uniqueDomains = [...domainNeedsCheck];
      const results = await Promise.all(
        uniqueDomains.map((domain) => hasMx(domain, mxTimeoutMs)),
      );
      uniqueDomains.forEach((domain, i) => domainResults.set(domain, results[i]));
    }

    for (const { item, domain } of pending) {
      if (domainResults.get(domain)) {
        verified.push(item);
      } else {
        rejected.push({ ...item, __rejectReason: "no_mx" });
      }
    }

    return {
      [outputVerifiedKey]: verified,
      [outputRejectedKey]: rejected,
      verifiedCount: verified.length,
      rejectedCount: rejected.length,
      domainsChecked: domainNeedsCheck.size,
    };
  },
};
