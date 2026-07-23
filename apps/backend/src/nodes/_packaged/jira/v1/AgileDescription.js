/**
 * Jira — Agile boards & sprints (Agile REST API v1.0).
 * Handlers receive `(config, ctx)`.
 */
import { axios, csv, LIMIT } from "../GenericFunctions.js";

async function opListBoards(config, ctx) {
  const res = await axios.get(`${ctx.AGILE}/board`, { headers: ctx.headers, timeout: 120000, params: { maxResults: LIMIT(config, 50), projectKeyOrId: config.project || undefined } });
  return { boards: res.data.values?.map((b) => ({ id: b.id, name: b.name, type: b.type })) ?? [], total: res.data.total };
}

async function opGetBoardIssues(config, ctx) {
  if (!config.boardId) return { success: false, error: "Jira getBoardIssues: 'boardId' is required.", skipped: true };
  const res = await axios.get(`${ctx.AGILE}/board/${encodeURIComponent(config.boardId)}/issue`, { headers: ctx.headers, timeout: 120000, params: { maxResults: LIMIT(config), jql: config.jql || undefined } });
  return { issues: res.data.issues?.map((i) => ({ key: i.key, summary: i.fields?.summary, status: i.fields?.status?.name })) ?? [], total: res.data.total };
}

async function opListSprints(config, ctx) {
  if (!config.boardId) return { success: false, error: "Jira listSprints: 'boardId' is required.", skipped: true };
  const res = await axios.get(`${ctx.AGILE}/board/${encodeURIComponent(config.boardId)}/sprint`, { headers: ctx.headers, timeout: 120000, params: { maxResults: LIMIT(config), state: config.sprintState || undefined } });
  return { sprints: res.data.values?.map((s) => ({ id: s.id, name: s.name, state: s.state, startDate: s.startDate, endDate: s.endDate })) ?? [] };
}

async function opCreateSprint(config, ctx) {
  if (!config.boardId || !config.name) return { success: false, error: "Jira createSprint: 'boardId' and 'name' are required.", skipped: true };
  const res = await axios.post(`${ctx.AGILE}/sprint`, { originBoardId: Number(config.boardId), name: config.name, startDate: config.startDate || undefined, endDate: config.endDate || undefined, goal: config.goal || undefined }, { headers: ctx.headers, timeout: 120000 });
  return { id: res.data.id, name: res.data.name, state: res.data.state, created: true };
}

async function opMoveIssuesToSprint(config, ctx) {
  if (!config.sprintId || !config.issueKeys) return { success: false, error: "Jira moveIssuesToSprint: 'sprintId' and 'issueKeys' are required.", skipped: true };
  await axios.post(`${ctx.AGILE}/sprint/${encodeURIComponent(config.sprintId)}/issue`, { issues: csv(config.issueKeys) }, { headers: ctx.headers, timeout: 120000 });
  return { moved: true, sprintId: config.sprintId, count: csv(config.issueKeys).length };
}

export const agileOperations = {
  listBoards: opListBoards,
  getBoardIssues: opGetBoardIssues,
  listSprints: opListSprints,
  createSprint: opCreateSprint,
  moveIssuesToSprint: opMoveIssuesToSprint,
};
