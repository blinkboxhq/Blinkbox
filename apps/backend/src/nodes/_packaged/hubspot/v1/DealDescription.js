/**
 * HubSpot — Deal resource. CRUD + search, preserved verbatim. Handlers receive
 * (config, { api }).
 */
import {
  need, props, createObject, getObject, updateObject, deleteObject, listObjects, searchObjects,
} from "../GenericFunctions.js";

export const DEAL_MAP = {
  dealName: "dealname", amount: "amount", stage: "dealstage", closeDate: "closedate",
  pipeline: "pipeline", ownerId: "hubspot_owner_id",
};

function opCreateDeal(c, { api }) {
  const e = need(c, "dealName", "createDeal"); if (e) return e;
  return createObject(api, "deals", props(c, DEAL_MAP));
}
function opGetDeal(c, { api }) {
  const e = need(c, "dealId", "getDeal"); if (e) return e;
  return getObject(api, "deals", c.dealId);
}
function opUpdateDeal(c, { api }) {
  const e = need(c, "dealId", "updateDeal"); if (e) return e;
  return updateObject(api, "deals", c.dealId, props(c, DEAL_MAP));
}
function opDeleteDeal(c, { api }) {
  const e = need(c, "dealId", "deleteDeal"); if (e) return e;
  return deleteObject(api, "deals", c.dealId);
}
const opListDeals = (c, { api }) => listObjects(api, "deals", c);
const opSearchDeals = (c, { api }) => searchObjects(api, "deals", c);

export const dealOperations = {
  createDeal: opCreateDeal,
  getDeal: opGetDeal,
  updateDeal: opUpdateDeal,
  deleteDeal: opDeleteDeal,
  listDeals: opListDeals,
  searchDeals: opSearchDeals,
};
