/**
 * DELAY NODE
 * Pauses the workflow, then resumes the same cursor after a computed instant.
 *
 * Two modes:
 *   mode = "duration" (default) — wait a relative amount of time from now.
 *       amount  — numeric quantity (default 10)
 *       unit    — "seconds" | "minutes" | "hours" | "days" (default "seconds")
 *       ms      — explicit millisecond override; wins over amount/unit when set.
 *
 *   mode = "until" — wait until a specific wall-clock instant.
 *       until   — ISO-8601 datetime string (e.g. "2026-07-12T09:00:00Z").
 *                 A time already in the past resumes immediately.
 *
 * Returns the engine signal { __delay: true, resumeAfter: <ISO string> }.
 * The executor reads resumeAfter via `new Date(...)`, which requires a valid
 * ISO string (CLAUDE.md contract), so we always emit one.
 */

const UNIT_MS = {
  seconds: 1000,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
};

// Hard cap so a fat-fingered "9999 days" can't wedge a cursor for years.
const MAX_DELAY_MS = 30 * UNIT_MS.days;

function durationMs(config) {
  if (config.ms != null && config.ms !== "") {
    const explicit = Number(config.ms);
    if (Number.isFinite(explicit)) return explicit;
  }
  const amount = Number(config.amount);
  const per = UNIT_MS[config.unit] ?? UNIT_MS.seconds;
  return (Number.isFinite(amount) ? amount : 0) * per;
}

export default {
  async run(config = {}, input) {
    const now = Date.now();
    let resumeMs;

    if (config.mode === "until") {
      const target = new Date(config.until);
      if (Number.isNaN(target.getTime())) {
        throw new Error(
          `[delay] "until" must be a valid datetime — got "${config.until}".`
        );
      }
      resumeMs = target.getTime();
    } else {
      let ms = durationMs(config);
      if (!Number.isFinite(ms) || ms < 0) ms = 0;
      resumeMs = now + Math.min(ms, MAX_DELAY_MS);
    }

    // Never schedule into the past; clamp so the resumer picks it up promptly.
    if (resumeMs < now) resumeMs = now;
    // Global ceiling regardless of mode.
    resumeMs = Math.min(resumeMs, now + MAX_DELAY_MS);

    // Sleeping is not a reason to lose the data — anything upstream of the
    // delay stays addressable after it.
    const carried =
      input && typeof input === "object" && !Array.isArray(input) ? input : {};

    return {
      ...carried,
      __delay: true,
      resumeAfter: new Date(resumeMs).toISOString(),
    };
  },
};
