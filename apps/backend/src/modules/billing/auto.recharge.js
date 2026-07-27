/**
 * Auto-recharge — the only place Blinkbox charges a card with nobody watching.
 *
 * Fired after a deduction drops the balance under the user's trigger point.
 * Every guard below exists to make a runaway charge loop impossible:
 *
 *   Redis lock    — a burst of parallel nodes produces one attempt, not twenty
 *   Cooldown      — a second charge cannot follow within AUTO_RECHARGE_COOLDOWN_MS
 *   Per-cycle cap — hard dollar ceiling, reset when the billing cycle rolls
 *   Failure count — three declines in a row switches auto-recharge off
 *   Idempotency   — keyed on the workspace + cycle spend so a retried attempt
 *                   reuses the same PaymentIntent instead of making another
 *
 * The charge is confirmed off-session, so a card that demands 3-D Secure fails
 * closed: we record the reason and let the user top up by hand.
 */

import WorkspaceUsage from "../../models/workspaceUsage.model.js";
import User from "../../models/user.model.js";
import { addPurchasedCredits } from "../../infra/credit.engine.js";
import { acquireLock, releaseLock } from "../../infra/redis.lock.js";
import { stripe } from "./stripe.client.js";
import { creditsForUsd, shouldRecharge, AUTO_RECHARGE_MAX_FAILURES } from "./credit.plans.js";

const LOCK_TTL_SECONDS = 60;

async function recordFailure(workspaceId, message) {
  const updated = await WorkspaceUsage.findOneAndUpdate(
    { workspaceId },
    {
      $inc: { "autoRecharge.failureCount": 1 },
      $set: { "autoRecharge.lastFailure": message.slice(0, 200) },
    },
    { returnDocument: "after" },
  );

  if (updated && updated.autoRecharge.failureCount >= AUTO_RECHARGE_MAX_FAILURES) {
    await WorkspaceUsage.updateOne({ workspaceId }, { $set: { "autoRecharge.enabled": false } });
    console.warn(`[AutoRecharge] disabled for ${workspaceId} after repeated failures: ${message}`);
  }
}

/**
 * Top up the workspace if its balance has fallen under the trigger point.
 * Never throws — it runs detached from the execution path and must not be
 * able to fail a workflow run.
 *
 * @returns {Promise<{ charged: boolean, reason?: string, credits?: number }>}
 */
export async function maybeAutoRecharge(workspaceId) {
  if (!stripe || !workspaceId) return { charged: false, reason: "unavailable" };

  let usage;
  try {
    // getOrCreate, not findOne — it rolls a due billing cycle, which is what
    // clears spentThisCycleUsd. Reading raw would weigh this month's top-up
    // against last month's cap and refuse a charge the user is owed.
    usage = await WorkspaceUsage.getOrCreate(workspaceId);
  } catch {
    return { charged: false, reason: "lookup_failed" };
  }

  // Cheap pre-check before reaching for the lock — almost every call stops here.
  const precheck = shouldRecharge(usage);
  if (!precheck.ok) return { charged: false, reason: precheck.reason };

  const lockKey = `autorecharge:${workspaceId}`;
  const owner = `${process.pid}:${Date.now()}`;
  if (!(await acquireLock(lockKey, owner, LOCK_TTL_SECONDS))) {
    return { charged: false, reason: "locked" };
  }

  try {
    // Re-read under the lock: another worker may have just topped this up.
    usage = await WorkspaceUsage.findOne({ workspaceId });
    const check = shouldRecharge(usage);
    if (!check.ok) return { charged: false, reason: check.reason };

    const { amountUsd, paymentMethodId, spentThisCycleUsd } = usage.autoRecharge;
    const credits = creditsForUsd(amountUsd);

    const user = await User.findById(workspaceId);
    if (!user?.stripeCustomerId) {
      await recordFailure(workspaceId, "No Stripe customer on file.");
      return { charged: false, reason: "no_customer" };
    }

    let intent;
    try {
      intent = await stripe.paymentIntents.create(
        {
          amount: amountUsd * 100,
          currency: "usd",
          customer: user.stripeCustomerId,
          payment_method: paymentMethodId,
          off_session: true,
          confirm: true,
          description: `Blinkbox auto top-up — ${credits.toLocaleString()} credits`,
          metadata: {
            userId: workspaceId,
            kind: "credits",
            auto: "true",
            credits: String(credits),
            amountUsd: String(amountUsd),
          },
        },
        // Ties the key to this cycle's spend so a retry of the same top-up
        // reuses the intent, while the next legitimate top-up gets a new one.
        { idempotencyKey: `ar:${workspaceId}:${usage.billingCycleStart.getTime()}:${spentThisCycleUsd || 0}` },
      );
    } catch (err) {
      await recordFailure(workspaceId, err.message || "Card was declined.");
      console.warn(`[AutoRecharge] charge failed for ${workspaceId}: ${err.message}`);
      return { charged: false, reason: "charge_failed" };
    }

    if (intent.status !== "succeeded") {
      await recordFailure(workspaceId, `Payment ${intent.status} — card needs confirmation.`);
      return { charged: false, reason: intent.status };
    }

    await addPurchasedCredits(workspaceId, {
      sessionId: intent.id,
      credits,
      amountUsd,
      auto: true,
    });

    await WorkspaceUsage.updateOne(
      { workspaceId },
      {
        $set: {
          "autoRecharge.lastChargeAt": new Date(),
          "autoRecharge.failureCount": 0,
          "autoRecharge.lastFailure": null,
        },
        $inc: { "autoRecharge.spentThisCycleUsd": amountUsd },
      },
    );

    console.log(`[AutoRecharge] ${workspaceId} topped up $${amountUsd} → ${credits} credits`);
    return { charged: true, credits };
  } catch (err) {
    console.error(`[AutoRecharge] unexpected error for ${workspaceId}: ${err.message}`);
    return { charged: false, reason: "error" };
  } finally {
    await releaseLock(lockKey, owner).catch(() => {});
  }
}
