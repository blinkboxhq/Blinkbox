import mongoose from "mongoose";
import Automation from "../../models/automation.model.js";
import Execution from "../../models/execution.model.js";
import ExecutionData from "../../models/executionData.model.js";
import { enqueueCursor } from "../workers/cursor.queue.js";
import { redis } from "../../infra/redis.client.js";
import { sanitizeAndLog } from "../../utils/errors.js";

const RATE_LIMIT = 60;
const RATE_WINDOW_SECONDS = 60;

async function isRateLimited(automationId, nodeId) {
  const key = `bb:ratelimit:wait:${automationId}:${nodeId}`;
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, RATE_WINDOW_SECONDS);
  return current > RATE_LIMIT;
}

/**
 * Release every run parked on a wait_for_event node.
 *
 * A wait_for_event node has no deadline — its cursors sit as `waiting` with
 * `waitingForWebhook: true` until this endpoint is called. The inbound request
 * is merged into the node's stored output first, so downstream nodes can read
 * {{ $json.body }} the moment they resume.
 */
export async function handleWaitWebhook(req, res) {
  try {
    const { automationId, nodeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(automationId)) {
      return res.status(404).json({ error: "Unknown wait endpoint." });
    }

    if (await isRateLimited(automationId, nodeId)) {
      return res.status(429).json({ error: "Too many requests. Slow down." });
    }

    const automation = await Automation.findById(automationId).select("edges").lean();
    if (!automation) return res.status(404).json({ error: "Unknown wait endpoint." });

    // Only the branches this wait node feeds may be released — an automation
    // can park on several wait nodes at once.
    const targets = new Set(
      (automation.edges ?? []).filter((e) => e.source === nodeId).map((e) => e.target),
    );
    if (targets.size === 0) {
      return res.status(200).json({ received: true, released: 0 });
    }

    const executions = await Execution.find({
      automationId,
      status: { $in: ["pending", "running"] },
      cursors: {
        $elemMatch: { nodeId: { $exists: true }, waitingForWebhook: true, status: "waiting" },
      },
    }).limit(50);

    const payload = {
      body: req.body ?? {},
      headers: req.headers ?? {},
      query: req.query ?? {},
      receivedAt: new Date().toISOString(),
      waiting: false,
    };

    let released = 0;

    for (const execution of executions) {
      const parked = execution.cursors.filter(
        (c) => c.status === "waiting" && c.waitingForWebhook && targets.has(c.nodeId),
      );
      if (parked.length === 0) continue;

      const stored = await ExecutionData.findOne({ executionId: execution._id, nodeId });
      if (!stored) continue; // this execution is parked on a different wait node

      const merged = (Array.isArray(stored.output) ? stored.output : []).map((item) => ({
        ...item,
        json: { ...(item?.json ?? {}), ...payload },
      }));
      stored.output = merged.length ? merged : [{ json: payload }];
      await stored.save();

      const toEnqueue = [];
      for (const cursor of parked) {
        cursor.status = "pending";
        cursor.waitingForWebhook = false;
        toEnqueue.push({
          executionId: execution._id.toString(),
          cursorId: cursor._id.toString(),
        });
      }

      await execution.save();
      for (const job of toEnqueue) await enqueueCursor(job);
      released += toEnqueue.length;
    }

    return res.status(200).json({ received: true, released });
  } catch (err) {
    sanitizeAndLog(err, "waitWebhook");
    return res.status(500).json({ error: "Failed to deliver the event." });
  }
}
