import { redis, stripPrefix } from "../../infra/redis.client.js";

const EXECUTION_TTL = 60 * 60 * 24;

function namespace(scope, ctx = {}) {
  switch (scope) {
    case "workflow":
      if (!ctx.automationId) throw new Error("variable_set_get: workflow scope needs a saved workflow.");
      return `bb:var:wf:${ctx.automationId}`;
    case "global":
      if (!ctx.workspaceId) throw new Error("variable_set_get: global scope needs a workspace.");
      return `bb:var:ws:${ctx.workspaceId}`;
    case "execution":
    default:
      if (!ctx.executionId) throw new Error("variable_set_get: execution scope needs an execution id.");
      return `bb:var:exec:${ctx.executionId}`;
  }
}

const encode = (v) => JSON.stringify({ v });
const decode = (raw) => {
  if (raw == null) return undefined;
  try { return JSON.parse(raw).v; } catch { return raw; }
};

export default {
  async run(config, input, ctx = {}) {
    const operation = config.operation || "set";
    const scope = config.scope || "execution";
    const prefix = namespace(scope, ctx);
    const key = config.key;

    if (operation !== "list" && !key) {
      return { success: false, error: "variable_set_get: 'key' is required.", skipped: true };
    }
    const redisKey = `${prefix}:${key}`;

    switch (operation) {
      case "set": {
        const value = config.value ?? input?.value ?? null;
        const ttl = Number(config.ttl ?? 0);
        const expiry = ttl > 0 ? ttl : scope === "execution" ? EXECUTION_TTL : 0;
        if (expiry > 0) await redis.set(redisKey, encode(value), "EX", expiry);
        else await redis.set(redisKey, encode(value));
        return { key, value, scope, found: true, ttl: expiry || null };
      }
      case "get": {
        const stored = decode(await redis.get(redisKey));
        const found = stored !== undefined;
        let fallback = config.defaultVal ?? null;
        if (typeof fallback === "string") {
          try { fallback = JSON.parse(fallback); } catch { /* plain string default */ }
        }
        return { key, value: found ? stored : fallback, scope, found };
      }
      case "delete": {
        const removed = await redis.del(redisKey);
        return { key, value: null, scope, found: removed > 0, deleted: removed > 0 };
      }
      case "list": {
        const found = [];
        let cursor = "0";
        do {
          const [next, batch] = await redis.scan(cursor, "MATCH", `${prefix}:*`, "COUNT", 200);
          cursor = next;
          found.push(...stripPrefix(batch));
        } while (cursor !== "0");

        const variables = {};
        if (found.length) {
          const values = await redis.mget(found);
          found.forEach((k, i) => { variables[k.slice(prefix.length + 1)] = decode(values[i]); });
        }
        return { scope, variables, keys: Object.keys(variables), count: found.length };
      }
      default:
        throw new Error(`variable_set_get: unknown operation "${operation}".`);
    }
  },
};
