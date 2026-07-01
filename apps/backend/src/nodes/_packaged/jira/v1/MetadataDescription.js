/**
 * Jira — metadata (issue types, priorities, fields).
 * Handlers receive `(config, ctx)`.
 */
import { axios } from "../GenericFunctions.js";

async function opListIssueTypes(config, ctx) {
  const res = await axios.get(`${ctx.BASE}/issuetype`, { headers: ctx.headers, timeout: 15000 });
  return { issueTypes: res.data.map((t) => ({ id: t.id, name: t.name, subtask: t.subtask })) };
}

async function opListPriorities(config, ctx) {
  const res = await axios.get(`${ctx.BASE}/priority`, { headers: ctx.headers, timeout: 15000 });
  return { priorities: res.data.map((p) => ({ id: p.id, name: p.name })) };
}

async function opGetFields(config, ctx) {
  const res = await axios.get(`${ctx.BASE}/field`, { headers: ctx.headers, timeout: 15000 });
  return { fields: res.data.map((f) => ({ id: f.id, name: f.name, custom: f.custom })).slice(0, 200), count: res.data.length };
}

export const metadataOperations = {
  listIssueTypes: opListIssueTypes,
  listPriorities: opListPriorities,
  getFields: opGetFields,
};
