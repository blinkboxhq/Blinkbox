/**
 * SUB-WORKFLOW NODE — "The Fractal"
 *
 * Triggers another Blinkbox automation as a child execution, passing data
 * between parent and child DAGs natively without external HTTP webhooks.
 *
 * In the Temporal engine, this node is intercepted in workflows.ts and
 * dispatched via executeChild() — the parent DAG blocks until the child
 * DAG completes and captures its full output.
 *
 * In the cursor-based engine, this file's run() is invoked via nodeRegistry.
 * It calls the execution service directly (non-Temporal fallback).
 *
 * Config (from frontend panel):
 *   targetAutomationId — The _id of the automation to invoke
 *   payload            — JSON object to pass as triggerData (merged with input)
 *
 * Output:
 *   The full output of the child DAG (all nodeOutputs from the child workflow)
 */

export default {
  async run(config, input) {
    const { targetAutomationId, payload = {} } = config;

    if (!targetAutomationId) {
      throw new Error(
        "Sub-Workflow Node: Missing targetAutomationId in config.",
      );
    }

    // Build the trigger data for the child: merge parent input with explicit payload.
    // Explicit payload keys take precedence over parent input.
    const childTriggerData = {
      ...input,
      ...payload,
      __parentContext: {
        triggeredBy: "sub_workflow",
        parentInput: input,
      },
    };

    // In the cursor engine, this sentinel tells the executor to handle
    // sub-workflow dispatch. The Temporal path never reaches this code —
    // workflows.ts intercepts sub_workflow nodes before calling executeNodeActivity.
    return {
      __subWorkflowPending: true,
      targetAutomationId,
      triggerData: childTriggerData,
      message:
        "Sub-workflow dispatch pending. " +
        `Target automation: ${targetAutomationId}`,
    };
  },
};
