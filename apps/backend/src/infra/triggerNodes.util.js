import Automation from "../models/automation.model.js";

export function getTriggerNodesOfType(automation, triggerType) {
  const nodes = automation?.nodes || [];
  const declared = automation?.triggerNodes;
  if (Array.isArray(declared) && declared.length) {
    return declared
      .filter((t) => t.type === triggerType)
      .map((t) => nodes.find((n) => n.id === t.nodeId))
      .filter(Boolean);
  }
  return nodes.filter(
    (n) => (n.type || n.data?.backendType) === triggerType && (n.data?.type === "trigger" || n.data?.config?.triggerVariant),
  );
}

export function getTriggerConfig(node) {
  return node?.data?.config || node?.data || {};
}

export async function findAutomationsWithTrigger(triggerType, extra = {}) {
  return Automation.find({
    active: true,
    ...extra,
    $or: [{ trigger: triggerType }, { "triggerNodes.type": triggerType }],
  });
}
