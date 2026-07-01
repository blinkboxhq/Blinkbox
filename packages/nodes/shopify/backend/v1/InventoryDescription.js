/**
 * Shopify — Inventory & Locations.
 */
import { need, lim } from "../GenericFunctions.js";

async function opGetInventoryLevels(c, { api }) {
  const params = { limit: lim(c.limit, 50) };
  if (c.inventoryItemIds) params.inventory_item_ids = c.inventoryItemIds;
  if (c.locationIds) params.location_ids = c.locationIds;
  const r = await api.get("/inventory_levels.json", { params });
  return { success: true, data: r.data.inventory_levels ?? [], count: r.data.inventory_levels?.length ?? 0 };
}
async function opSetInventoryLevel(c, { api }) {
  for (const k of ["inventoryItemId", "locationId", "available"]) { const e = need(c, k, "setInventoryLevel"); if (e) return e; }
  const r = await api.post("/inventory_levels/set.json", { inventory_item_id: c.inventoryItemId, location_id: c.locationId, available: Number(c.available) });
  return { success: true, ...r.data.inventory_level };
}
async function opAdjustInventoryLevel(c, { api }) {
  for (const k of ["inventoryItemId", "locationId", "adjustment"]) { const e = need(c, k, "adjustInventoryLevel"); if (e) return e; }
  const r = await api.post("/inventory_levels/adjust.json", { inventory_item_id: c.inventoryItemId, location_id: c.locationId, available_adjustment: Number(c.adjustment) });
  return { success: true, ...r.data.inventory_level };
}
async function opListLocations(c, { api }) {
  const r = await api.get("/locations.json");
  return { success: true, data: r.data.locations ?? [], count: r.data.locations?.length ?? 0 };
}

export const inventoryOperations = {
  getInventoryLevels: opGetInventoryLevels, setInventoryLevel: opSetInventoryLevel,
  adjustInventoryLevel: opAdjustInventoryLevel, listLocations: opListLocations,
};
