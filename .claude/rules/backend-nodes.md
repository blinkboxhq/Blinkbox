# Backend Node Development

Apply these rules whenever creating or modifying files in `apps/backend/src/nodes/`.

---

## Node File Structure

Every backend node must export a standard definition object:

```js
// apps/backend/src/nodes/myNode.node.js
export default {
  name: 'myNode',          // camelCase, matches nodeRegistry key
  type: 'action',          // 'trigger' | 'action' | 'logic'
  inputs: {
    fieldName: { type: 'string', required: true, description: '...' },
  },
  outputs: {
    result: { type: 'object' },
  },
  handler: async (config, context) => {
    // stateless — only process config + context, return result
  },
};
```

## Handler Rules

- **Stateless.** Never read from module-level variables. Only process the `config` and `context` you receive.
- **Async-first.** All handlers are `async`. Use `await` properly — no `.then()` chains.
- **Wrap all external calls** in try/catch. On failure, throw with a descriptive message so the execution engine can log the exact failure point.
- **Return shape** must match the `outputs` schema declared above.

## Error Handling Pattern

```js
handler: async (config, context) => {
  try {
    const result = await externalApiCall(config.param);
    return { success: true, data: result };
  } catch (err) {
    throw new Error(`[myNode] ${err.message}`);
  }
},
```

Errors propagate to `cursor.executor.js` → `executionLog.model.ts` → visible in the History tab.

## Registration

After creating the node file, register it:
1. In `apps/backend/src/nodes/agentTools.registry.js` — add import + push to exports array
2. In `apps/frontend/src/pages/Workspace/nodeRegistry.js` — add the frontend registry entry

## Secrets & Config

- **Never hardcode** API keys, URLs, or credentials.
- Always pull from `apps/backend/src/config/env.js` which validates on startup:
  ```js
  import env from '../config/env.js';
  const apiKey = env.MY_SERVICE_API_KEY;
  ```
- Credential-backed nodes (OAuth, API key) must look up from the Credential store using `context.getCredential(credentialId)`.

## Trigger Nodes

Trigger nodes have an additional `setup` export:

```js
export default {
  name: 'webhookTrigger',
  type: 'trigger',
  setup: async (workflowId, config, onEvent) => {
    // register webhook, cron, etc.
    // call onEvent(payload) when triggered
  },
  teardown: async (workflowId, config) => {
    // deregister / clean up
  },
  handler: async (payload, context) => payload, // pass-through for triggers
};
```

## Performance Rules

- Non-blocking I/O always. Use `async/await` or Node.js streams — never `fs.readFileSync` or `request()`.
- For bulk operations (batch email, bulk DB writes) use batching with a configurable `batchSize` param.
- Cache external API responses where appropriate using Redis (`apps/backend/src/infra/redis.lock.js`).
- CPU-heavy operations (image processing, heavy parsing) must be offloaded to a worker thread.

## Execution Engine Integration

The cursor executor (`cursor.executor.js`) runs nodes sequentially along the workflow graph. Your handler receives:
- `config` — the user-configured values from the frontend config panel
- `context` — `{ workflowId, executionId, getCredential, log, previousOutput }`

Use `context.previousOutput` to access data from the previous node (analogous to `$json` in n8n).
