import { NODE_ACTIONS } from "./nodeActions";

// Two ways to say the same thing reach us: the picker writes the human label
// ("Post Message") into config.selectedAction, while an AI-built node writes the
// canonical value ("postMessage") into config.operation — which is what the
// executor and every ConfigPanel actually run on. Read either, or an AI-built
// node reads as "no action chosen" while being fully configured.
export function resolveSelectedAction(backendType, config = {}) {
  if (config.selectedAction) return config.selectedAction;
  if (!config.operation) return "";
  return NODE_ACTIONS[backendType]?.find((a) => a.value === config.operation)?.name || "";
}

export function actionValueFor(backendType, name) {
  return NODE_ACTIONS[backendType]?.find((a) => a.name === name)?.value || "";
}

// A node dropped from the picker gets data.label = its registry label, so that
// value carries no intent of its own. Only a label that diverges from the
// defaults is a name somebody chose — a user rename, or an AI naming the step —
// and that name outranks the generic one.
export function customNodeName(data = {}, ...defaultLabels) {
  if (data.config?.customLabel) return data.config.customLabel;
  const label = data.label;
  if (!label) return "";
  return defaultLabels.some((d) => d === label) ? "" : label;
}
