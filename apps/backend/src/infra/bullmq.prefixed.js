/**
 * BullMQ, namespaced per tenant.
 *
 * BullMQ does not honour ioredis' `keyPrefix` — its Lua scripts address key
 * slots explicitly, so a prefix set on the connection is silently ignored and
 * every managed instance would share one `bull:*` namespace on our Redis: one
 * customer's worker draining another customer's queue. BullMQ takes its own
 * `prefix` option instead, which is what these three wrappers inject.
 *
 * Import Queue / Worker / QueueEvents from here, never from "bullmq" directly.
 * A single direct import reopens the hole for whichever queue it builds.
 */

import { Queue as BaseQueue, Worker as BaseWorker, QueueEvents as BaseQueueEvents } from "bullmq";
import { REDIS_KEY_PREFIX } from "../config/env.js";

// "bull" is BullMQ's own default; keeping it as the suffix means local and cloud
// keys are unchanged and only managed instances move into a tenant namespace.
export const QUEUE_PREFIX = REDIS_KEY_PREFIX ? `${REDIS_KEY_PREFIX}bull` : "bull";

// Forced, not defaulted: a caller passing its own prefix would be opting out of
// tenant isolation, and no caller has a legitimate reason to.
const scoped = (opts) => ({ ...opts, prefix: QUEUE_PREFIX });

export class Queue extends BaseQueue {
  constructor(name, opts) {
    super(name, scoped(opts));
  }
}

export class Worker extends BaseWorker {
  constructor(name, processor, opts) {
    super(name, processor, scoped(opts));
  }
}

export class QueueEvents extends BaseQueueEvents {
  constructor(name, opts) {
    super(name, scoped(opts));
  }
}
