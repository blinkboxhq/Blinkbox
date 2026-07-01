/**
 * Zendesk — Groups.
 */
import { need, lim, enc } from "../GenericFunctions.js";

async function opListGroups(config, { api }) {
  const { data } = await api.get(`/groups.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, groups: data.groups || [], count: data.count };
}
async function opGetGroup(config, { api }) {
  const g = need(config, "groupId", "getGroup"); if (g) return g;
  const { data } = await api.get(`/groups/${enc(config.groupId)}.json`);
  return data.group;
}
async function opCreateGroup(config, { api }) {
  const n = need(config, "name", "createGroup"); if (n) return n;
  const { data } = await api.post(`/groups.json`, { group: { name: config.name, description: config.description } });
  return data.group;
}
async function opUpdateGroup(config, { api }) {
  const g = need(config, "groupId", "updateGroup"); if (g) return g;
  const group = {};
  if (config.name) group.name = config.name;
  if (config.description) group.description = config.description;
  const { data } = await api.put(`/groups/${enc(config.groupId)}.json`, { group });
  return data.group;
}
async function opDeleteGroup(config, { api }) {
  const g = need(config, "groupId", "deleteGroup"); if (g) return g;
  await api.delete(`/groups/${enc(config.groupId)}.json`);
  return { success: true, deleted: config.groupId };
}

export const groupOperations = {
  listGroups: opListGroups, getGroup: opGetGroup, createGroup: opCreateGroup,
  updateGroup: opUpdateGroup, deleteGroup: opDeleteGroup,
};
