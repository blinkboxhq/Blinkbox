/**
 * DISTRIBUTOR NODE — splits input array across N parallel worker branches.
 * Works like the loop node: each chunk becomes its own cursor.
 *
 * Strategy:
 *   parallel    — send each item to all workers simultaneously
 *   round_robin — distribute items one-at-a-time across workers in order
 *   load_balance — divide array into equal-sized chunks, one chunk per worker
 */
export default {
  async run(config, input) {
    const workers = Math.max(1, config.workers ?? 3);
    const strategy = config.strategy ?? "parallel";

    // If input is an array, distribute it; otherwise treat as single item
    const items = Array.isArray(input)
      ? input
      : Array.isArray(input?.items)
      ? input.items
      : [input];

    if (items.length === 0) {
      return { __loopFanOut: true, items: [] };
    }

    if (strategy === "parallel") {
      // Send ALL items to ALL workers — fan-out per item
      return {
        __loopFanOut: true,
        items: items.map((item, i) => ({
          json: {
            ...(typeof item === "object" ? item : { value: item }),
            __workerIndex: i % workers,
            __itemIndex: i,
            __totalItems: items.length,
          },
        })),
      };
    }

    if (strategy === "round_robin") {
      // Items distributed round-robin across workers
      return {
        __loopFanOut: true,
        items: items.map((item, i) => ({
          json: {
            ...(typeof item === "object" ? item : { value: item }),
            __workerIndex: i % workers,
            __itemIndex: i,
            __totalItems: items.length,
          },
        })),
      };
    }

    // load_balance — chunk the array into N chunks
    const chunkSize = Math.ceil(items.length / workers);
    const chunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push({
        json: {
          items: items.slice(i, i + chunkSize),
          __workerIndex: chunks.length,
          __chunkSize: chunkSize,
          __totalChunks: Math.ceil(items.length / chunkSize),
        },
      });
    }

    return { __loopFanOut: true, items: chunks };
  },
};
