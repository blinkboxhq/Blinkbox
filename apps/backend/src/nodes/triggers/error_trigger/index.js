export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const err = b?.error ?? b;
    return {
      event:           "workflow.error",
      errorMessage:    err?.message || b?.errorMessage || b?.message || "Unknown error",
      errorType:       err?.name || err?.type || b?.errorType || "Error",
      errorCode:       err?.code || b?.errorCode,
      errorStack:      config.includeStack ? (err?.stack || b?.stack) : null,
      failedNodeId:    b?.nodeId || b?.failedNodeId,
      failedNodeType:  b?.nodeType || b?.failedNodeType,
      failedNodeLabel: b?.nodeLabel || b?.failedNodeLabel,
      workflowId:      b?.workflowId || config.workflowId,
      executionId:     b?.executionId,
      workspaceName:   b?.workspaceName,
      triggeredAt:     b?.triggeredAt || new Date().toISOString(),
      input:           config.includeInput ? b?.input : null,
    };
  },
};
