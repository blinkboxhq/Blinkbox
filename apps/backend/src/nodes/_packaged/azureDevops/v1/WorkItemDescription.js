/**
 * AZURE DEVOPS — Work Item resource. listWorkItems/createWorkItem preserved
 * verbatim from the monolith; getWorkItem, updateWorkItem, deleteWorkItem,
 * queryWiql added for parity. Handlers receive (config, client).
 */

const PATCH_CT = "application/json-patch+json";

async function opListWorkItems(config, client) {
  const wiql = { query: `SELECT [Id],[Title],[State],[AssignedTo] FROM WorkItems WHERE [System.TeamProject] = '${client.project}' ORDER BY [Id] DESC` };
  const queryRes = await client.post(`${client.base}/wit/wiql?${client.API}`, wiql);
  const ids = (queryRes.data.workItems || []).slice(0, parseInt(config.limit || 20)).map((w) => w.id);
  if (!ids.length) return { items: [], count: 0 };
  const itemsRes = await client.get(`${client.base}/wit/workitems?ids=${ids.join(",")}&${client.API}`);
  return { items: itemsRes.data.value, count: itemsRes.data.value.length };
}

async function opGetWorkItem(config, client) {
  if (!config.workItemId) return { success: false, error: "azure_devops getWorkItem: 'workItemId' is required.", skipped: true };
  const res = await client.get(`${client.base}/wit/workitems/${config.workItemId}?${client.API}`);
  return res.data;
}

async function opCreateWorkItem(config, client) {
  if (!config.title) return { success: false, error: "azure_devops createWorkItem: 'title' is required.", skipped: true };
  const type = config.workItemType || "Task";
  const body = [
    { op: "add", path: "/fields/System.Title", value: config.title },
    { op: "add", path: "/fields/System.Description", value: config.description || "" },
  ];
  const res = await client.post(`${client.base}/wit/workitems/$${type}?${client.API}`, body, PATCH_CT);
  return res.data;
}

async function opUpdateWorkItem(config, client) {
  if (!config.workItemId) return { success: false, error: "azure_devops updateWorkItem: 'workItemId' is required.", skipped: true };
  const body = [];
  if (config.title) body.push({ op: "add", path: "/fields/System.Title", value: config.title });
  if (config.description) body.push({ op: "add", path: "/fields/System.Description", value: config.description });
  if (config.state) body.push({ op: "add", path: "/fields/System.State", value: config.state });
  if (config.assignedTo) body.push({ op: "add", path: "/fields/System.AssignedTo", value: config.assignedTo });
  if (!body.length) return { success: false, error: "azure_devops updateWorkItem: no fields to update.", skipped: true };
  const res = await client.patch(`${client.base}/wit/workitems/${config.workItemId}?${client.API}`, body, PATCH_CT);
  return res.data;
}

async function opDeleteWorkItem(config, client) {
  if (!config.workItemId) return { success: false, error: "azure_devops deleteWorkItem: 'workItemId' is required.", skipped: true };
  await client.del(`${client.base}/wit/workitems/${config.workItemId}?${client.API}`);
  return { deleted: true, workItemId: config.workItemId };
}

async function opQueryWiql(config, client) {
  if (!config.wiql) return { success: false, error: "azure_devops queryWiql: 'wiql' query is required.", skipped: true };
  const res = await client.post(`${client.base}/wit/wiql?${client.API}`, { query: config.wiql });
  return { workItems: res.data.workItems || [], count: (res.data.workItems || []).length };
}

export const workItemOperations = {
  listWorkItems: opListWorkItems,
  getWorkItem: opGetWorkItem,
  createWorkItem: opCreateWorkItem,
  updateWorkItem: opUpdateWorkItem,
  deleteWorkItem: opDeleteWorkItem,
  queryWiql: opQueryWiql,
};
