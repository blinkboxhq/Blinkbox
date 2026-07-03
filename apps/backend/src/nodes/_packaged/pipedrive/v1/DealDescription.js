/**
 * Pipedrive — Deal resource. Full CRUD, search, followers, participants,
 * products, and stage/status changes.
 */
import { boundLimit, num } from "../GenericFunctions.js";

async function opListDeals(config, client) {
  const { data } = await client.get("/deals", {
    params: { limit: boundLimit(config.limit), start: Number(config.start) || 0, status: config.status || "all_not_deleted" },
  });
  return { success: true, deals: data.data ?? [], total: data.additional_data?.pagination?.more_items_in_collection };
}

async function opGetDeal(config, client) {
  if (!config.dealId) return { success: false, error: "Pipedrive getDeal: dealId required.", skipped: true };
  const { data } = await client.get(`/deals/${config.dealId}`);
  if (!data.data) return { success: false, error: `Pipedrive: Deal ${config.dealId} not found.`, skipped: true };
  return { success: true, ...data.data };
}

function buildDealBody(config) {
  const body = {};
  if (config.title != null) body.title = config.title;
  if (config.value != null) body.value = num(config.value);
  if (config.currency) body.currency = config.currency;
  if (config.closeTime) body.close_time = config.closeTime;
  if (config.personId) body.person_id = num(config.personId);
  if (config.orgId) body.org_id = num(config.orgId);
  if (config.stageId) body.stage_id = num(config.stageId);
  if (config.pipelineId) body.pipeline_id = num(config.pipelineId);
  if (config.userId) body.user_id = num(config.userId);
  if (config.status) body.status = config.status;
  if (config.probability != null) body.probability = num(config.probability);
  if (config.expectedCloseDate) body.expected_close_date = config.expectedCloseDate;
  if (config.visibleTo != null) body.visible_to = num(config.visibleTo);
  return body;
}

async function opCreateDeal(config, client) {
  if (!config.title) return { success: false, error: "Pipedrive createDeal: title required.", skipped: true };
  const { data } = await client.post("/deals", { ...buildDealBody(config), title: config.title });
  return { success: true, id: data.data?.id, title: data.data?.title, status: data.data?.status, value: data.data?.value };
}

async function opUpdateDeal(config, client) {
  if (!config.dealId) return { success: false, error: "Pipedrive updateDeal: dealId required.", skipped: true };
  const { data } = await client.put(`/deals/${config.dealId}`, buildDealBody(config));
  return { success: true, id: data.data?.id, title: data.data?.title, status: data.data?.status, value: data.data?.value };
}

async function opDeleteDeal(config, client) {
  if (!config.dealId) return { success: false, error: "Pipedrive deleteDeal: dealId required.", skipped: true };
  await client.delete(`/deals/${config.dealId}`);
  return { success: true, deleted: true, id: config.dealId };
}

async function opSearchDeals(config, client) {
  if (!config.term) return { success: false, error: "Pipedrive searchDeals: term required.", skipped: true };
  const params = { term: config.term, limit: boundLimit(config.limit) };
  if (config.status) params.status = config.status;
  if (config.personId) params.person_id = num(config.personId);
  if (config.orgId) params.organization_id = num(config.orgId);
  const { data } = await client.get("/deals/search", { params });
  return { success: true, items: data.data?.items ?? [], total: data.data?.items?.length ?? 0 };
}

async function opListDealActivities(config, client) {
  if (!config.dealId) return { success: false, error: "Pipedrive listDealActivities: dealId required.", skipped: true };
  const { data } = await client.get(`/deals/${config.dealId}/activities`, { params: { limit: boundLimit(config.limit) } });
  return { success: true, activities: data.data ?? [] };
}

async function opListDealPersons(config, client) {
  if (!config.dealId) return { success: false, error: "Pipedrive listDealPersons: dealId required.", skipped: true };
  const { data } = await client.get(`/deals/${config.dealId}/persons`, { params: { limit: boundLimit(config.limit) } });
  return { success: true, persons: data.data ?? [] };
}

async function opListDealProducts(config, client) {
  if (!config.dealId) return { success: false, error: "Pipedrive listDealProducts: dealId required.", skipped: true };
  const { data } = await client.get(`/deals/${config.dealId}/products`);
  return { success: true, products: data.data ?? [] };
}

async function opAddDealProduct(config, client) {
  if (!config.dealId || !config.productId) return { success: false, error: "Pipedrive addDealProduct: dealId and productId required.", skipped: true };
  const body = { product_id: num(config.productId), item_price: num(config.itemPrice ?? 0), quantity: num(config.quantity ?? 1) };
  if (config.discountPercentage != null) body.discount_percentage = num(config.discountPercentage);
  const { data } = await client.post(`/deals/${config.dealId}/products`, body);
  return { success: true, product: data.data };
}

async function opAddDealFollower(config, client) {
  if (!config.dealId || !config.userId) return { success: false, error: "Pipedrive addDealFollower: dealId and userId required.", skipped: true };
  const { data } = await client.post(`/deals/${config.dealId}/followers`, { user_id: num(config.userId) });
  return { success: true, follower: data.data };
}

export const dealOperations = {
  listDeals: opListDeals,
  getDeal: opGetDeal,
  createDeal: opCreateDeal,
  updateDeal: opUpdateDeal,
  deleteDeal: opDeleteDeal,
  searchDeals: opSearchDeals,
  listDealActivities: opListDealActivities,
  listDealPersons: opListDealPersons,
  listDealProducts: opListDealProducts,
  addDealProduct: opAddDealProduct,
  addDealFollower: opAddDealFollower,
};
