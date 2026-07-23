/**
 * Jira — issue transitions (transition, list transitions).
 * Handlers receive `(config, ctx)`.
 */
import { axios, adf } from "../GenericFunctions.js";

async function opTransitionIssue(config, ctx) {
  if (!config.issueKey || !config.transitionId) return { success: false, error: "Jira transitionIssue: 'issueKey' and 'transitionId' are required.", skipped: true };
  const body = { transition: { id: config.transitionId } };
  if (config.comment) body.update = { comment: [{ add: { body: adf(config.comment) } }] };
  await axios.post(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/transitions`, body, { headers: ctx.headers, timeout: 120000 });
  return { transitioned: true, issueKey: config.issueKey };
}

async function opListTransitions(config, ctx) {
  if (!config.issueKey) return { success: false, error: "Jira listTransitions: 'issueKey' is required.", skipped: true };
  const res = await axios.get(`${ctx.BASE}/issue/${encodeURIComponent(config.issueKey)}/transitions`, { headers: ctx.headers, timeout: 120000 });
  return { transitions: res.data.transitions?.map((t) => ({ id: t.id, name: t.name, to: t.to?.name })) ?? [] };
}

export const transitionOperations = {
  transitionIssue: opTransitionIssue,
  listTransitions: opListTransitions,
};
