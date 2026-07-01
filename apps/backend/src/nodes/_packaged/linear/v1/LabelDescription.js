/**
 * Linear — Label resource. Handlers receive `(config, apiKey)`.
 */
import { gql, LIMIT } from "../GenericFunctions.js";

async function opListLabels(config, apiKey) {
  const data = await gql(`query($first: Int) { issueLabels(first: $first) { nodes { id name color team { key } } } }`, { first: LIMIT(config, 50) }, apiKey);
  return { labels: data.issueLabels.nodes.map((l) => ({ id: l.id, name: l.name, color: l.color, team: l.team?.key })) };
}

async function opCreateLabel(config, apiKey) {
  if (!config.name) return { success: false, error: "Linear createLabel: 'name' is required.", skipped: true };
  const input = { name: config.name };
  if (config.teamId) input.teamId = config.teamId;
  if (config.color) input.color = config.color;
  const data = await gql(`mutation($input: IssueLabelCreateInput!) { issueLabelCreate(input: $input) { success issueLabel { id name } } }`, { input }, apiKey);
  return { id: data.issueLabelCreate.issueLabel.id, name: data.issueLabelCreate.issueLabel.name, created: true };
}

async function opAddLabelToIssue(config, apiKey) {
  if (!config.issueId || !config.labelIds) return { success: false, error: "Linear addLabelToIssue: 'issueId' and 'labelIds' are required.", skipped: true };
  const labelIds = String(config.labelIds).split(",").map((s) => s.trim()).filter(Boolean);
  await gql(`mutation($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success } }`, { id: config.issueId, input: { labelIds } }, apiKey);
  return { updated: true, issueId: config.issueId, labelIds };
}

export const labelOperations = {
  listLabels: opListLabels,
  createLabel: opCreateLabel,
  addLabelToIssue: opAddLabelToIssue,
};
