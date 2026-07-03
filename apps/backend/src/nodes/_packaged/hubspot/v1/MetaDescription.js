/**
 * HubSpot — Meta resources: associations, pipelines, owners, properties, and
 * lists. Original handlers preserved verbatim; disassociate & getList added for
 * parity. Handlers receive (config, { api }).
 */
import { need, enc, csv } from "../GenericFunctions.js";

async function opAssociateObjects(c, { api }) {
  for (const k of ["fromType", "fromId", "toType", "toId"]) {
    const e = need(c, k, "associateObjects"); if (e) return e;
  }
  await api.put(
    `/crm/v4/objects/${enc(c.fromType)}/${enc(c.fromId)}/associations/default/${enc(c.toType)}/${enc(c.toId)}`,
    {}
  );
  return { success: true, associated: true, from: `${c.fromType}/${c.fromId}`, to: `${c.toType}/${c.toId}` };
}
async function opDisassociateObjects(c, { api }) {
  for (const k of ["fromType", "fromId", "toType", "toId"]) {
    const e = need(c, k, "disassociateObjects"); if (e) return e;
  }
  await api.delete(
    `/crm/v4/objects/${enc(c.fromType)}/${enc(c.fromId)}/associations/${enc(c.toType)}/${enc(c.toId)}`,
  );
  return { success: true, disassociated: true, from: `${c.fromType}/${c.fromId}`, to: `${c.toType}/${c.toId}` };
}
async function opListAssociations(c, { api }) {
  for (const k of ["fromType", "fromId", "toType"]) {
    const e = need(c, k, "listAssociations"); if (e) return e;
  }
  const r = await api.get(`/crm/v4/objects/${enc(c.fromType)}/${enc(c.fromId)}/associations/${enc(c.toType)}`);
  return { success: true, data: r.data.results ?? [], count: r.data.results?.length ?? 0 };
}

async function opListPipelines(c, { api }) {
  const r = await api.get(`/crm/v3/pipelines/${enc(c.objectType || "deals")}`);
  return { success: true, data: r.data.results ?? [], count: r.data.results?.length ?? 0 };
}
async function opListOwners(c, { api }) {
  const r = await api.get("/crm/v3/owners", { params: { limit: 100, email: c.email || undefined } });
  return { success: true, data: r.data.results ?? [], count: r.data.results?.length ?? 0 };
}
async function opGetOwner(c, { api }) {
  const e = need(c, "ownerId", "getOwner"); if (e) return e;
  const r = await api.get(`/crm/v3/owners/${enc(c.ownerId)}`);
  return { success: true, ...r.data };
}
async function opListProperties(c, { api }) {
  const r = await api.get(`/crm/v3/properties/${enc(c.objectType || "contacts")}`);
  return { success: true, data: r.data.results ?? [], count: r.data.results?.length ?? 0 };
}

async function opAddToList(c, { api }) {
  let e = need(c, "listId", "addToList"); if (e) return e;
  e = need(c, "contactId", "addToList"); if (e) return e;
  await api.put(`/crm/v3/lists/${enc(c.listId)}/memberships/add`, csv(c.contactId).map(Number));
  return { success: true, added: true, listId: c.listId };
}
async function opRemoveFromList(c, { api }) {
  let e = need(c, "listId", "removeFromList"); if (e) return e;
  e = need(c, "contactId", "removeFromList"); if (e) return e;
  await api.put(`/crm/v3/lists/${enc(c.listId)}/memberships/remove`, csv(c.contactId).map(Number));
  return { success: true, removed: true, listId: c.listId };
}
async function opGetList(c, { api }) {
  const e = need(c, "listId", "getList"); if (e) return e;
  const r = await api.get(`/crm/v3/lists/${enc(c.listId)}`);
  return { success: true, ...(r.data.list ?? r.data) };
}

export const metaOperations = {
  associateObjects: opAssociateObjects,
  disassociateObjects: opDisassociateObjects,
  listAssociations: opListAssociations,
  listPipelines: opListPipelines,
  listOwners: opListOwners,
  getOwner: opGetOwner,
  listProperties: opListProperties,
  addToList: opAddToList,
  removeFromList: opRemoveFromList,
  getList: opGetList,
};
