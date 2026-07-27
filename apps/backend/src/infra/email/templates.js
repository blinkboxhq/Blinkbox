/**
 * Every transactional email Blinkbox sends.
 *
 * Each builder returns { subject, preheader, html }. The subject and preheader
 * are what a crowded inbox actually shows, so both carry the fact — never
 * "Update from Blinkbox". Plan numbers come from credit.plans.js so a reprice
 * can't leave stale figures behind in someone's inbox.
 */

import { PLANS, PAYG_CREDITS_PER_USD } from "../../modules/billing/credit.plans.js";
import {
  APP_URL,
  APP_NAME,
  C,
  FONT,
  esc,
  fmtCredits,
  fmtUsd,
  fmtDate,
  fmtDateTime,
  layout,
  eyebrow,
  heading,
  para,
  note,
  strong,
  divider,
  btn,
  fallback,
  rows,
  stats,
  meter,
  callout,
  receipt,
  features,
  codeBlock,
} from "./theme.js";

const DASH = `${APP_URL}/dashboard`;
const USAGE = `${APP_URL}/dashboard?tab=usage`;
const SECURITY = `${APP_URL}/dashboard?tab=security`;

const firstName = (user) => {
  const n = (user?.name || "").trim().split(/\s+/)[0];
  return n || "there";
};

const wrap = (subject, preheader, body) => ({
  subject,
  preheader,
  html: layout({ subject, preheader, body }),
});

/* ================================================================== *
 * Onboarding & identity
 * ================================================================== */

export function buildRegistrationEmail(user, verifyUrl) {
  const body = `
${eyebrow("Confirm your email")}
${heading(`Welcome to ${APP_NAME}, ${esc(firstName(user))}`)}
${para(`Your account is created. Confirm this address and your workspace opens with ${strong(`${fmtCredits(PLANS.free.credits)} free credits`)} already loaded — enough to build and run your first automations today.`)}
${btn(verifyUrl, "Verify my email")}
${fallback(verifyUrl)}
${divider()}
${features([
  ["Build visually", "drag nodes onto a canvas, connect them, hit run"],
  ["Trigger on anything", "webhooks, schedules, email, or an app event"],
  ["Only pay for work done", "credits are spent per successful step, never per attempt"],
])}
${note("This link expires in 24 hours. If you didn't create this account you can ignore this email.")}`;

  return wrap(`Verify your ${APP_NAME} email`, `Confirm your address and claim ${fmtCredits(PLANS.free.credits)} free credits.`, body);
}

export function buildVerificationEmail(user, verifyUrl) {
  const body = `
${eyebrow("New link")}
${heading("Here's a fresh verification link")}
${para(`You asked for another one, ${esc(firstName(user))}. This replaces every link sent before it.`)}
${btn(verifyUrl, "Verify my email")}
${fallback(verifyUrl)}
${note("Valid for 24 hours. Didn't request this? Nothing happens if you ignore it.")}`;

  return wrap(`Your ${APP_NAME} verification link`, "One click and your workspace is live.", body);
}

export function buildWelcomeEmail(user) {
  const body = `
${eyebrow("You're in", C.good)}
${heading(`Thanks for joining, ${esc(firstName(user))}`)}
${para(`Your workspace is live with ${strong(`${fmtCredits(PLANS.free.credits)} credits`)} refreshing every month. Here's the fastest route to a working automation.`)}
${stats([
  { label: "Plan", value: "Free", sub: "No card needed" },
  { label: "Credits", value: fmtCredits(PLANS.free.credits), sub: "Every month" },
  { label: "Workflows", value: "Unlimited", sub: "Build as many as you like" },
])}
${btn(DASH, "Open my dashboard")}
${divider()}
${features([
  ["Start from a trigger", "pick what kicks things off — a webhook, a schedule, a new email"],
  ["Chain the steps", "call an API, scrape a page, branch on a condition, send the result"],
  ["Watch it run", "every execution is logged step by step, so a failure tells you exactly where"],
])}
${note(`Stuck on something? Reply to this email — it reaches a person.`)}`;

  return wrap(`Welcome to ${APP_NAME}`, `${fmtCredits(PLANS.free.credits)} credits are waiting in your workspace.`, body);
}

/* ================================================================== *
 * Security
 * ================================================================== */

export function buildPasswordResetEmail(user, resetUrl) {
  const body = `
${eyebrow("Password reset")}
${heading("Set a new password")}
${para(`We got a request to reset the password for ${strong(user?.email || "your account")}. Use the button below — the link works once and expires in 15 minutes.`)}
${btn(resetUrl, "Choose a new password")}
${fallback(resetUrl)}
${divider()}
${callout("warn", "Didn't ask for this?", `Ignore this email and your password stays as it is. If you get these repeatedly, <a href="${SECURITY}" style="color:${C.accentHot};">review your account security</a>.`)}`;

  return wrap(`Reset your ${APP_NAME} password`, "The link is good for 15 minutes.", body);
}

export function buildGoogleOnlyResetEmail(user) {
  const body = `
${eyebrow("Sign-in method")}
${heading("This account signs in with Google")}
${para(`There's no password on ${strong(user?.email || "your account")} to reset, ${esc(firstName(user))} — it was created through Google, so Google handles the sign-in.`)}
${btn(`${APP_URL}/login`, "Continue with Google")}
${note("Want a password as well? Sign in with Google first, then add one from your account settings.")}`;

  return wrap(`Signing in to ${APP_NAME}`, "Your account uses Google sign-in.", body);
}

export function buildPasswordChangedEmail(user) {
  const body = `
${eyebrow("Password changed", C.good)}
${heading("Your password was updated")}
${para(`The password on ${strong(user?.email || "your account")} changed just now. If that was you, you're all set — nothing else to do.`)}
${rows([["Account", user?.email || "—"], ["Changed", fmtDateTime(new Date())]], { monoValues: true })}
${divider()}
${callout("bad", "Wasn't you?", `Reset the password immediately and sign out every other session from <a href="${SECURITY}" style="color:${C.accentHot};">your security settings</a>.`)}`;

  return wrap(`Your ${APP_NAME} password was changed`, "If this wasn't you, act now.", body);
}

export function buildLoginAlertEmail(user, { ip, userAgent, at } = {}) {
  const body = `
${eyebrow("New sign-in")}
${heading("New sign-in to your account")}
${para(`Someone just signed in to ${strong(user?.email || "your account")}. If it was you, no action is needed.`)}
${rows(
  [
    ["When", fmtDateTime(at || new Date())],
    ["IP address", ip || "Unknown"],
    ["Device", (userAgent || "Unknown").slice(0, 90)],
  ],
  { monoValues: true },
)}
${divider()}
${callout("warn", "Don't recognise this?", `Change your password now and end the other sessions from <a href="${SECURITY}" style="color:${C.accentHot};">your security settings</a>.`)}
${btn(SECURITY, "Review account security", "quiet")}`;

  return wrap(`New sign-in to your ${APP_NAME} account`, `${ip || "A new device"} just signed in.`, body);
}

export function buildSecureAccountEmail(user, { reason, ip, userAgent, at } = {}) {
  const why =
    reason ||
    "We saw unusual activity on your account — several failed sign-in attempts in a short window.";

  const body = `
${eyebrow("Action recommended", C.warn)}
${heading("Secure your account")}
${para(esc(why))}
${para(`Nothing has been changed on ${strong(user?.email || "your account")}, but it's worth taking two minutes to lock it down.`)}
${rows(
  [
    ["Detected", fmtDateTime(at || new Date())],
    ip ? ["IP address", ip] : null,
    userAgent ? ["Device", userAgent.slice(0, 90)] : null,
  ],
  { monoValues: true },
)}
${divider()}
${features([
  ["Change your password", "pick something you don't use anywhere else"],
  ["Sign out everywhere", "ends every session but the one you're using"],
  ["Rotate your API keys", "anything shared or pasted into a tool should be replaced"],
])}
${btn(SECURITY, "Secure my account")}
${note("If none of this looks unusual to you, you can safely ignore this message.")}`;

  return wrap(`Secure your ${APP_NAME} account`, "Unusual activity — a two-minute check is worth it.", body);
}

export function buildSecurityCodeEmail(user, code) {
  const body = `
${eyebrow("Verification code")}
${heading("Your sign-in code")}
${para("Enter this code to finish signing in. It expires in 5 minutes and can only be used once.")}
${codeBlock(code)}
${note("Never share this code. Nobody from Blinkbox will ever ask you for it.")}`;

  return wrap(`${code} is your ${APP_NAME} code`, "Expires in 5 minutes.", body);
}

/* ================================================================== *
 * Subscription lifecycle
 * ================================================================== */

export function buildProWelcomeEmail(user, { renewsOn } = {}) {
  const pro = PLANS.pro;
  const body = `
${eyebrow("Pro is live", C.good)}
${heading(`You're on Pro, ${esc(firstName(user))}`)}
${para(`Payment went through and your allowance jumped to ${strong(`${fmtCredits(pro.credits)} credits a month`)} — ${Math.round(pro.credits / PLANS.free.credits)}× the free plan, refreshed at the start of every cycle.`)}
${stats([
  { label: "Plan", value: "Pro", tone: C.accent, sub: `${fmtUsd(pro.priceUsd)} / month` },
  { label: "Credits", value: fmtCredits(pro.credits), sub: "Every month" },
  { label: "Renews", value: renewsOn ? fmtDate(renewsOn) : "In one month", sub: "Cancel any time" },
])}
${btn(DASH, "Start building")}
${divider()}
${features(
  pro.features.map((f) => {
    const map = {
      "Buy extra credits any time": ["Top up on demand", `$1 adds ${fmtCredits(PAYG_CREDITS_PER_USD)} credits, and bought credits never expire`],
      "AI agent builder": ["AI agent builder", "describe the outcome, let the agent assemble the steps"],
      "Headless web scraping": ["Headless scraping", "render real pages with a browser, not a fragile fetch"],
      "Team collaboration": ["Team collaboration", "share workspaces and hand off automations"],
      "Advanced analytics": ["Advanced analytics", "see cost and failure patterns across every run"],
      "Priority support": ["Priority support", "your replies jump the queue"],
    };
    return map[f] || null;
  }),
)}
${note(`Invoices and receipts land in this inbox automatically. Manage everything from <a href="${USAGE}" style="color:${C.accentHot};">billing</a>.`)}`;

  return wrap(`Welcome to ${APP_NAME} Pro`, `${fmtCredits(pro.credits)} credits a month, starting now.`, body);
}

export function buildRenewalReminderEmail(user, { renewsOn, amountUsd, cardBrand, cardLast4 } = {}) {
  const amount = fmtUsd(amountUsd ?? PLANS.pro.priceUsd);
  const body = `
${eyebrow("Renewal notice")}
${heading("Your Pro plan renews soon")}
${para(`Heads up, ${esc(firstName(user))} — ${strong(`${APP_NAME} Pro`)} renews on ${strong(renewsOn ? fmtDate(renewsOn) : "your next billing date")} and we'll charge ${strong(amount)}. No action needed if you're staying.`)}
${rows([
  ["Plan", `${APP_NAME} Pro`],
  ["Amount", amount],
  ["Renews on", renewsOn ? fmtDate(renewsOn) : "—"],
  cardLast4 ? ["Card", `${cardBrand ? `${cardBrand} ` : ""}•••• ${cardLast4}`] : null,
])}
${para(`Your ${fmtCredits(PLANS.pro.credits)} monthly credits reset the same day. Unused plan credits don't carry over — credits you bought outright do.`)}
${btn(USAGE, "Manage plan", "quiet")}
${note("Need to change your card or cancel? Both live in the billing portal, and cancelling keeps Pro running until the end of the period you already paid for.")}`;

  return wrap(
    `Your ${APP_NAME} Pro plan renews ${renewsOn ? fmtDate(renewsOn) : "soon"}`,
    `${amount} on your card, then ${fmtCredits(PLANS.pro.credits)} fresh credits.`,
    body,
  );
}

export function buildInvoiceEmail(user, {
  invoiceNumber,
  amountUsd,
  paidAt,
  periodStart,
  periodEnd,
  cardBrand,
  cardLast4,
  invoiceUrl,
} = {}) {
  const amount = fmtUsd(amountUsd ?? PLANS.pro.priceUsd);
  const period =
    periodStart && periodEnd ? `${fmtDate(periodStart)} — ${fmtDate(periodEnd)}` : null;

  const body = `
${eyebrow("Receipt", C.good)}
${heading("Payment received")}
${para(`Thanks, ${esc(firstName(user))}. Here's the receipt for your ${APP_NAME} Pro subscription.`)}
${receipt({
  items: [
    { label: `${APP_NAME} Pro — monthly`, sub: period, amount },
    { label: `${fmtCredits(PLANS.pro.credits)} credits`, sub: "Included with the plan", amount: "Included" },
  ],
  total: amount,
})}
${divider(22, 22)}
${rows(
  [
    invoiceNumber ? ["Invoice", invoiceNumber] : null,
    ["Paid", fmtDateTime(paidAt || new Date())],
    cardLast4 ? ["Card", `${cardBrand ? `${cardBrand} ` : ""}•••• ${cardLast4}`] : null,
    ["Billed to", user?.email || "—"],
  ],
  { monoValues: true },
)}
${invoiceUrl ? btn(invoiceUrl, "Download invoice", "quiet") : btn(USAGE, "View billing", "quiet")}
${note("Keep this for your records — it's a valid receipt for expensing.")}`;

  return wrap(
    `Your ${APP_NAME} receipt — ${amount}`,
    `Payment received for ${APP_NAME} Pro.`,
    body,
  );
}

export function buildPaymentFailedEmail(user, { amountUsd, attemptCount, nextAttempt, updateUrl } = {}) {
  const amount = fmtUsd(amountUsd ?? PLANS.pro.priceUsd);
  const url = updateUrl || USAGE;

  const body = `
${eyebrow("Payment failed", C.bad)}
${heading("We couldn't charge your card")}
${para(`The ${strong(amount)} payment for ${APP_NAME} Pro didn't go through. Usually it's an expired card or a bank block — both take a minute to fix.`)}
${callout(
  "bad",
  "Pro stays active for now",
  `We'll retry automatically${nextAttempt ? ` on ${esc(fmtDate(nextAttempt))}` : ""}. If the payment keeps failing your workspace drops to the free plan and its ${fmtCredits(PLANS.free.credits)} monthly credits.`,
)}
${btn(url, "Update payment method", "danger")}
${divider()}
${rows(
  [
    ["Amount due", amount],
    attemptCount ? ["Attempt", String(attemptCount)] : null,
    nextAttempt ? ["Next retry", fmtDate(nextAttempt)] : null,
  ],
  { monoValues: true },
)}
${note("Credits you bought outright are unaffected — they never expire, whatever happens to the subscription.")}`;

  return wrap(`Payment failed — action needed on your ${APP_NAME} account`, `${amount} didn't go through.`, body);
}

export function buildProEndingSoonEmail(user, periodEnd) {
  const endStr = periodEnd ? fmtDate(periodEnd) : "the end of your billing period";

  const body = `
${eyebrow("Cancellation confirmed", C.warn)}
${heading("Your Pro plan is ending")}
${para(`Your ${APP_NAME} Pro subscription is set to cancel, ${esc(firstName(user))}. You keep every Pro feature until ${strong(endStr)} — you already paid for that time.`)}
${rows([
  ["Pro access until", endStr],
  ["Then", `Free plan — ${fmtCredits(PLANS.free.credits)} credits / month`],
  ["Purchased credits", "Kept — they never expire"],
])}
${divider()}
${para(`After that date your allowance drops from ${fmtCredits(PLANS.pro.credits)} to ${fmtCredits(PLANS.free.credits)} credits a month. Your workflows stay exactly where they are; they just draw from the smaller pool.`)}
${btn(USAGE, "Reactivate Pro")}
${note(`Changed your mind? Reactivate before ${esc(endStr)} and nothing about your billing changes.`)}`;

  return wrap(`Your ${APP_NAME} Pro plan ends ${endStr}`, `Pro features stay on until ${endStr}.`, body);
}

export function buildProEndedEmail(user, { endedOn } = {}) {
  const body = `
${eyebrow("Plan changed")}
${heading("You're back on the free plan")}
${para(`Your ${APP_NAME} Pro subscription ended${endedOn ? ` on ${strong(fmtDate(endedOn))}` : ""}. Your workspace, workflows and credentials are all untouched — the monthly allowance is what changed.`)}
${stats([
  { label: "Plan now", value: "Free", sub: `${fmtCredits(PLANS.free.credits)} credits / month` },
  { label: "Was", value: "Pro", sub: `${fmtCredits(PLANS.pro.credits)} credits / month` },
  { label: "Bought credits", value: "Kept", tone: C.good, sub: "Never expire" },
])}
${divider()}
${para(`Running more than the free pool covers? You can top up at ${strong(`${fmtCredits(PAYG_CREDITS_PER_USD)} credits per $1`)} without a subscription, or come back to Pro whenever it makes sense.`)}
${btn(USAGE, "See plans and top-ups")}
${note("We'd genuinely like to know what didn't work — reply and tell us.")}`;

  return wrap(`Your ${APP_NAME} Pro plan has ended`, `Back on free — ${fmtCredits(PLANS.free.credits)} credits a month.`, body);
}

/* ================================================================== *
 * Credits
 * ================================================================== */

export function buildTopUpReceiptEmail(user, { credits, amountUsd, purchasedBalance, receiptId, at } = {}) {
  const amount = fmtUsd(amountUsd);
  const body = `
${eyebrow("Top-up complete", C.good)}
${heading(`${fmtCredits(credits)} credits added`)}
${para(`Your top-up went through, ${esc(firstName(user))}. The credits are in your workspace now and they never expire.`)}
${receipt({
  items: [
    {
      label: `${fmtCredits(credits)} credits`,
      sub: `${fmtCredits(PAYG_CREDITS_PER_USD)} credits per $1`,
      amount,
    },
  ],
  total: amount,
})}
${divider(22, 22)}
${rows(
  [
    typeof purchasedBalance === "number"
      ? ["Purchased balance", `${fmtCredits(purchasedBalance)} credits`]
      : null,
    ["Paid", fmtDateTime(at || new Date())],
    receiptId ? ["Reference", receiptId] : null,
    ["Billed to", user?.email || "—"],
  ],
  { monoValues: true },
)}
${btn(USAGE, "View balance", "quiet")}`;

  return wrap(`${fmtCredits(credits)} credits added to ${APP_NAME}`, `${amount} — receipt inside.`, body);
}

export function buildAutoTopUpEmail(user, {
  credits,
  amountUsd,
  purchasedBalance,
  cardBrand,
  cardLast4,
  spentThisCycleUsd,
  monthlyCapUsd,
  thresholdCredits,
} = {}) {
  const amount = fmtUsd(amountUsd);
  const body = `
${eyebrow("Auto top-up")}
${heading(`We topped you up — ${fmtCredits(credits)} credits`)}
${para(`Your balance dropped below ${strong(`${fmtCredits(thresholdCredits)} credits`)}, so auto top-up charged ${strong(amount)} to your saved card and kept your automations running.`)}
${receipt({
  items: [{ label: `${fmtCredits(credits)} credits`, sub: "Automatic top-up", amount }],
  total: amount,
})}
${divider(22, 22)}
${rows(
  [
    typeof purchasedBalance === "number"
      ? ["Purchased balance", `${fmtCredits(purchasedBalance)} credits`]
      : null,
    cardLast4 ? ["Card", `${cardBrand ? `${cardBrand} ` : ""}•••• ${cardLast4}`] : null,
    typeof spentThisCycleUsd === "number" && monthlyCapUsd
      ? ["Auto-spend this cycle", `${fmtUsd(spentThisCycleUsd)} of ${fmtUsd(monthlyCapUsd)} cap`]
      : null,
    ["Charged", fmtDateTime(new Date())],
  ],
  { monoValues: true },
)}
${btn(USAGE, "Adjust auto top-up", "quiet")}
${note("Auto top-up never charges past the monthly cap you set, and you can switch it off at any time from the credits page.")}`;

  return wrap(`Auto top-up: ${fmtCredits(credits)} credits added`, `${amount} charged to your saved card.`, body);
}

export function buildLowBalanceEmail(user, { remaining, monthlyLimit, purchased, percentUsed, plan } = {}) {
  const pct = typeof percentUsed === "number" ? percentUsed : 90;
  const isPro = plan === "pro";

  const body = `
${eyebrow("Low balance", C.warn)}
${heading("You're running low on credits")}
${para(`Your workspace has ${strong(`${fmtCredits(remaining)} credits`)} left. When it hits zero, workflow steps stop running until the balance recovers.`)}
${meter(pct, { caption: `${pct}% of this cycle's credits used` })}
${divider(22, 22)}
${stats([
  { label: "Remaining", value: fmtCredits(remaining), tone: pct >= 90 ? C.warn : C.hi },
  { label: "Plan credits", value: fmtCredits(monthlyLimit), sub: "Resets each cycle" },
  { label: "Bought", value: fmtCredits(purchased), sub: "Never expire" },
])}
${divider()}
${
  isPro
    ? para(`Top up at ${strong(`${fmtCredits(PAYG_CREDITS_PER_USD)} credits per $1`)}, or turn on auto top-up so this never interrupts a run again.`)
    : para(`Pro gives you ${strong(`${fmtCredits(PLANS.pro.credits)} credits a month for ${fmtUsd(PLANS.pro.priceUsd)}`)} — or top up as you go at ${fmtCredits(PAYG_CREDITS_PER_USD)} credits per $1.`)
}
${btn(USAGE, isPro ? "Add credits" : "See plans and top-ups")}
${note("You'll only get this warning once a day, no matter how many runs go through.")}`;

  return wrap(
    `Low credits on your ${APP_NAME} workspace`,
    `${fmtCredits(remaining)} credits left — runs stop at zero.`,
    body,
  );
}

export function buildAutoRechargeDisabledEmail(user, { reason, cardBrand, cardLast4 } = {}) {
  const body = `
${eyebrow("Auto top-up off", C.bad)}
${heading("Auto top-up has been switched off")}
${para(`Your saved card was declined three times in a row, so we stopped trying. Nothing further has been charged.`)}
${rows(
  [
    cardLast4 ? ["Card", `${cardBrand ? `${cardBrand} ` : ""}•••• ${cardLast4}`] : null,
    reason ? ["Last reason", reason.slice(0, 90)] : null,
    ["Stopped", fmtDateTime(new Date())],
  ],
  { monoValues: true },
)}
${divider()}
${callout("warn", "Your runs will stop at zero credits", "Add a working card and switch auto top-up back on, or top up by hand whenever you need to.")}
${btn(USAGE, "Fix payment method", "danger")}`;

  return wrap(`Auto top-up disabled on your ${APP_NAME} workspace`, "Your card was declined three times.", body);
}

/* ================================================================== *
 * Digest & announcements
 * ================================================================== */

export function buildWeeklyDigestEmail(user, {
  periodStart,
  periodEnd,
  runs = 0,
  succeeded = 0,
  failed = 0,
  creditsUsed = 0,
  remaining = 0,
  percentUsed = 0,
  topWorkflows = [],
  plan = "free",
} = {}) {
  const successRate = runs ? Math.round((succeeded / runs) * 100) : 0;
  const range =
    periodStart && periodEnd ? `${fmtDate(periodStart)} — ${fmtDate(periodEnd)}` : "The last 7 days";

  const top = topWorkflows.length
    ? `${divider()}
<div style="font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:${C.dim};padding-bottom:12px;">Busiest automations</div>
${rows(topWorkflows.slice(0, 5).map((w) => [w.name || "Untitled", `${fmtCredits(w.credits || 0)} cr · ${w.runs || 0} runs`]))}`
    : "";

  const body = `
${eyebrow("Weekly digest")}
${heading("Your week in automation")}
${para(`${esc(range)} — here's what your workspace got through, ${esc(firstName(user))}.`)}
${stats([
  { label: "Runs", value: String(runs) },
  { label: "Success rate", value: `${successRate}%`, tone: successRate >= 95 ? C.good : successRate >= 80 ? C.hi : C.warn },
  { label: "Credits used", value: fmtCredits(creditsUsed) },
])}
<div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>
${meter(percentUsed, { caption: `${fmtCredits(remaining)} credits left · ${percentUsed}% of this cycle used` })}
${failed > 0 ? `<div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>${callout("warn", `${failed} run${failed === 1 ? "" : "s"} failed this week`, `Open the history tab to see which step broke and why. Failed steps don't cost credits.`)}` : ""}
${top}
${btn(DASH, "Open dashboard")}
${note(
  plan === "pro"
    ? "Want this on a different day, or not at all? Email preferences live in your account settings."
    : `On the free plan you get ${fmtCredits(PLANS.free.credits)} credits a month. Pro raises that to ${fmtCredits(PLANS.pro.credits)} for ${fmtUsd(PLANS.pro.priceUsd)}.`,
)}`;

  return wrap(
    `Your ${APP_NAME} week — ${runs} run${runs === 1 ? "" : "s"}, ${fmtCredits(creditsUsed)} credits`,
    `${successRate}% success rate · ${fmtCredits(remaining)} credits left.`,
    body,
  );
}

export function buildPlanUpdateEmail(user, {
  title = "We're updating our plans",
  summary = "",
  changes = [],
  effectiveOn,
  ctaLabel = "See what's changing",
  ctaUrl,
} = {}) {
  const body = `
${eyebrow("Plan update")}
${heading(title)}
${para(summary ? esc(summary) : `We're making some changes to ${APP_NAME} pricing, ${esc(firstName(user))}. Here's exactly what's different and when it takes effect.`)}
${changes.length ? features(changes.map((c) => [c.title || c[0], c.detail || c[1]])) : ""}
${effectiveOn ? `<div style="height:22px;line-height:22px;font-size:0;">&nbsp;</div>${callout("info", `Takes effect ${fmtDate(effectiveOn)}`, "Nothing changes on your account before then, and you'll be billed at your current rate until that date.")}` : ""}
${divider()}
${rows([
  ["Free", `${fmtCredits(PLANS.free.credits)} credits / month`],
  ["Pro", `${fmtCredits(PLANS.pro.credits)} credits / month · ${fmtUsd(PLANS.pro.priceUsd)}`],
  ["Top-ups", `${fmtCredits(PAYG_CREDITS_PER_USD)} credits per $1 · never expire`],
])}
${btn(ctaUrl || `${APP_URL}/#pricing`, ctaLabel)}
${note("Questions about how this affects your workspace? Reply to this email and we'll walk you through it.")}`;

  return wrap(`${APP_NAME}: ${title}`, summary || "What's changing, and when.", body);
}
