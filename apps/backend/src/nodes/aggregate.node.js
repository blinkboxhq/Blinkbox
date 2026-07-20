import { redis } from "../infra/redis.client.js";

export default {
  async run(config, input, ctx = {}) {
    // Cursors fanned out from one loop share an executionId, so that is the
    // batch by default — inventing a session id is not a question a user can
    // answer.
    const sessionId = config.sessionId
      || (ctx.executionId && ctx.nodeId ? `${ctx.executionId}:${ctx.nodeId}` : null);
    if (!sessionId) throw new Error("Aggregate: no batch to group by — set 'sessionId'.");

    const expectedCount = parseInt(config.expectedCount);
    if (!expectedCount || expectedCount < 1) throw new Error("Aggregate: 'expectedCount' must be a positive number.");

    const ttl = parseInt(config.ttlSeconds) || 300;
    const key = `bb:agg:${sessionId}`;

    const item = config.aggregateKey
      ? (input?.[config.aggregateKey] ?? input)
      : input;

    await redis.rpush(key, JSON.stringify(item));
    await redis.expire(key, ttl);

    const length = await redis.llen(key);

    if (length < expectedCount) {
      return { __hold: true, collected: length, expected: expectedCount };
    }

    const raw = await redis.lrange(key, 0, -1);
    await redis.del(key);

    const items = raw.map((r) => { try { return JSON.parse(r); } catch { return r; } });

    return { items, count: items.length, sessionId, completedAt: new Date().toISOString() };
  },
};
