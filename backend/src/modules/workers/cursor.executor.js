import Execution from "../../models/execution.model.js";
import Automation from "../../models/automation.model.js";
import { nodeRegistry } from "../../nodes/index.js";
import { enqueueCursor } from "./cursor.queue.js";
import { evaluateCondition } from "../../modules/automation/engine/condition.evaluator.js";
import { emitExecutionEvent } from "../execution/execution.events.js";

export async function processCursor({ executionId, cursorId }) {
  const execution = await Execution.findById(executionId);
  if (!execution) return;

  const cursor = execution.cursors.id(cursorId);
  if (!cursor || cursor.status !== "pending") return;

  const automation = await Automation.findById(execution.automationId);
  if (!automation) throw new Error("Automation missing");

  const node = automation.nodes.find((n) => n.id === cursor.nodeId);
  if (!node) throw new Error(`Node not found: ${cursor.nodeId}`);

  const handler = nodeRegistry[node.type];
  if (!handler?.run) throw new Error(`Unsupported node: ${node.type}`);

  cursor.status = "running";
  await execution.save();

  try {
    await emitExecutionEvent(execution._id, {
      type: "node_started",
      nodeId: node.id,
    });

    const output = await handler.run(node.config, execution.context);

    execution.context = { ...execution.context, ...output };

    execution.logs.push({
      nodeId: node.id,
      nodeType: node.type,
      status: "success",
      input: node.config,
      output,
    });

    cursor.status = "completed";

    await emitExecutionEvent(execution._id, {
      type: "node_completed",
      nodeId: node.id,
    });

    const edges = automation.edges.filter(
      (e) => e.from === node.id && e.type === "onSuccess",
    );

    for (const edge of edges) {
      if (evaluateCondition(edge.condition, execution.context)) {
        const newCursor = {
          nodeId: edge.to,
          status: "pending",
          retries: 0,
        };
        execution.cursors.push(newCursor);

        await enqueueCursor({
          executionId: execution._id,
          cursorId: execution.cursors.at(-1)._id.toString(),
        });
      }
    }
  } catch (err) {
    cursor.status = "failed";

    execution.logs.push({
      nodeId: node.id,
      nodeType: node.type,
      status: "failed",
      error: err.message,
    });

    const edges = automation.edges.filter(
      (e) => e.from === node.id && e.type === "onFailure",
    );

    for (const edge of edges) {
      const newCursor = {
        nodeId: edge.to,
        status: "pending",
        retries: 0,
      };
      execution.cursors.push(newCursor);

      await enqueueCursor({
        executionId: execution._id,
        cursorId: execution.cursors.at(-1)._id.toString(),
      });
    }
  }

  await execution.save();

  // finalize execution if done
  const active = execution.cursors.some(
    (c) => c.status === "pending" || c.status === "running",
  );

  if (!active) {
    execution.status = execution.cursors.some((c) => c.status === "failed")
      ? "failed"
      : "executed";
    execution.completedAt = new Date();

    await emitExecutionEvent(execution._id, {
      type: "execution_completed",
    });

    await execution.save();
  }
}
