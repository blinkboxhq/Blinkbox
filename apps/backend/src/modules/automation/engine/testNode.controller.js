import { nodeRegistry } from "../../../nodes/index.js";

export async function testNode(req, res) {
  const { nodeType, config = {}, input = {} } = req.body;

  if (!nodeType) {
    return res.status(400).json({ error: "nodeType is required" });
  }

  const handler = nodeRegistry[nodeType];
  if (!handler) {
    return res.status(404).json({ error: `No backend handler for node type: ${nodeType}` });
  }

  const ctx = {
    workspaceId: req.user.id,
    workflowId: "test",
    executionId: `test_${Date.now()}`,
    log: () => {},
  };

  const startMs = Date.now();
  try {
    let result;
    if (handler.toolDefinition) {
      result = await handler.run(config, input, ctx);
    } else if (typeof handler.run === "function") {
      result = await handler.run(config, input, ctx);
    } else {
      return res.status(400).json({ error: `Node ${nodeType} has no run() method` });
    }

    return res.json({
      success: true,
      output: Array.isArray(result) ? result : [{ json: result }],
      durationMs: Date.now() - startMs,
    });
  } catch (err) {
    return res.json({
      success: false,
      error: err.message,
      durationMs: Date.now() - startMs,
    });
  }
}
