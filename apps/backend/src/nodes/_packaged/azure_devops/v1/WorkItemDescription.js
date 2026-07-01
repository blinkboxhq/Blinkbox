/**
 * Azure DevOps — work items. Handlers receive `(config, ctx)`.
 */
import { API, enc, LIMIT, jsonPatch, skip, get, post, patch, del } from "../GenericFunctions.js";

async function opCreateWorkItem(config, ctx) {
  if (!config.project || !config.title) return skip("createWorkItem", "'project' and 'title' are required");
  const type = config.workItemType || "Task";
  const ops = jsonPatch([
    { op: "add", path: "/fields/System.Title", value: config.title },
    { op: "add", path: "/fields/System.Description", value: config.description },
    { op: "add", path: "/fields/System.AssignedTo", value: config.assignedTo },
    { op: "add", path: "/fields/Microsoft.VSTS.Common.Priority", value: config.priority ? Number(config.priority) : undefined },
    { op: "add", path: "/fields/System.Tags", value: config.tags },
  ]);
  const url = `${ctx.PROJ}/_apis/wit/workitems/$${enc(type)}?api-version=${API}`;
  const data = await patch(url, ops, ctx, "application/json-patch+json");
  return { id: data.id, url: data._links?.html?.href, type, title: config.title, created: true };
}

async function opGetWorkItem(config, ctx) {
  if (!config.workItemId) return skip("getWorkItem", "'workItemId' is required");
  const data = await get(`${ctx.ORG}/_apis/wit/workitems/${enc(config.workItemId)}?$expand=all&api-version=${API}`, ctx);
  return { id: data.id, fields: data.fields, url: data._links?.html?.href };
}

async function opUpdateWorkItem(config, ctx) {
  if (!config.workItemId) return skip("updateWorkItem", "'workItemId' is required");
  const ops = jsonPatch([
    { op: "add", path: "/fields/System.Title", value: config.updateTitle || config.title },
    { op: "add", path: "/fields/System.State", value: config.state },
    { op: "add", path: "/fields/System.AssignedTo", value: config.assignedTo },
    { op: "add", path: "/fields/Microsoft.VSTS.Common.Priority", value: config.priority ? Number(config.priority) : undefined },
    { op: "add", path: "/fields/System.Description", value: config.description },
  ]);
  if (!ops.length) return skip("updateWorkItem", "no fields to update");
  const data = await patch(`${ctx.ORG}/_apis/wit/workitems/${enc(config.workItemId)}?api-version=${API}`, ops, ctx, "application/json-patch+json");
  return { id: data.id, fields: data.fields, updated: true };
}

async function opDeleteWorkItem(config, ctx) {
  if (!config.workItemId) return skip("deleteWorkItem", "'workItemId' is required");
  await del(`${ctx.ORG}/_apis/wit/workitems/${enc(config.workItemId)}?api-version=${API}`, ctx);
  return { id: config.workItemId, deleted: true };
}

async function opListWorkItems(config, ctx) {
  if (!config.project) return skip("listWorkItems", "'project' is required");
  const wiql = config.wiql || "SELECT [Id] FROM WorkItems WHERE [System.TeamProject] = @project ORDER BY [System.CreatedDate] DESC";
  const res = await post(`${ctx.PROJ}/_apis/wit/wiql?api-version=${API}&$top=${LIMIT(config)}`, { query: wiql }, ctx);
  const ids = (res.workItems || []).map((w) => w.id).slice(0, LIMIT(config));
  if (!ids.length) return { workItems: [], count: 0 };
  const detail = await get(`${ctx.ORG}/_apis/wit/workitems?ids=${ids.join(",")}&fields=System.Id,System.Title,System.State,System.WorkItemType,System.AssignedTo&api-version=${API}`, ctx);
  return { workItems: (detail.value || []).map((w) => ({ id: w.id, ...w.fields })), count: detail.count };
}

async function opAddWorkItemComment(config, ctx) {
  if (!config.workItemId || !config.text || !config.project) return skip("addWorkItemComment", "'project', 'workItemId' and 'text' are required");
  const data = await post(`${ctx.PROJ}/_apis/wit/workItems/${enc(config.workItemId)}/comments?api-version=${API}-preview.4`, { text: config.text }, ctx);
  return { id: data.id, text: data.text, created: true };
}

async function opListWorkItemComments(config, ctx) {
  if (!config.workItemId || !config.project) return skip("listWorkItemComments", "'project' and 'workItemId' are required");
  const data = await get(`${ctx.PROJ}/_apis/wit/workItems/${enc(config.workItemId)}/comments?api-version=${API}-preview.4`, ctx);
  return { comments: (data.comments || []).map((c) => ({ id: c.id, text: c.text, author: c.createdBy?.displayName, createdAt: c.createdDate })), count: data.totalCount };
}

async function opListWorkItemTypes(config, ctx) {
  if (!config.project) return skip("listWorkItemTypes", "'project' is required");
  const data = await get(`${ctx.PROJ}/_apis/wit/workitemtypes?api-version=${API}`, ctx);
  return { types: (data.value || []).map((t) => ({ name: t.name, referenceName: t.referenceName, color: t.color })) };
}

export const workItemOperations = {
  createWorkItem: opCreateWorkItem,
  getWorkItem: opGetWorkItem,
  updateWorkItem: opUpdateWorkItem,
  deleteWorkItem: opDeleteWorkItem,
  listWorkItems: opListWorkItems,
  addWorkItemComment: opAddWorkItemComment,
  listWorkItemComments: opListWorkItemComments,
  listWorkItemTypes: opListWorkItemTypes,
};
