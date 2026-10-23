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
  // Without triggerNodes, activation treats entryNodeId as the trigger; flattened
  // nodes carry triggerVariant at the top level rather than under config.
  return nodes.filter(
    (n) =>
      (n.type || n.data?.backendType) === triggerType &&
      (n.id === automation?.entryNodeId ||
        n.data?.type === "trigger" ||
        n.data?.triggerVariant ||
        n.data?.config?.triggerVariant),
  );
}

// node.data is the flattened config the canvas and API write today. A nested
// `config` is left over from older saves; it fills gaps but must never shadow
// newer flat edits (that pinned schedules to whatever was saved first).
export function getTriggerConfig(node) {
  const data = node?.data || {};
  const { config, ...flat } = data;
  if (!config || typeof config !== "object" || Array.isArray(config)) return data;
  // Legacy nodes keep the canvas role marker in data.type; it is not a setting.
  if (flat.type === "trigger" || flat.type === "action") delete flat.type;
  return { ...config, ...flat };
}

export async function findAutomationsWithTrigger(triggerType, extra = {}) {
  return Automation.find({
    active: true,
    ...extra,
    $or: [{ trigger: triggerType }, { "triggerNodes.type": triggerType }],
  });
}
