/**
 * Shopify — operation router. Merges every v1 resource map into one dispatch
 * table and runs the selected op. Handlers receive `(config, { api })` where
 * `api` is the axios instance built by the backend entry via makeApi(shop, token).
 */
import { handleError } from "./GenericFunctions.js";
import { productOperations } from "./v1/ProductDescription.js";
import { variantOperations } from "./v1/VariantDescription.js";
import { collectionOperations } from "./v1/CollectionDescription.js";
import { inventoryOperations } from "./v1/InventoryDescription.js";
import { orderOperations } from "./v1/OrderDescription.js";
import { fulfillmentOperations } from "./v1/FulfillmentDescription.js";
import { customerOperations } from "./v1/CustomerDescription.js";
import { draftOrderOperations } from "./v1/DraftOrderDescription.js";
import { discountOperations } from "./v1/DiscountDescription.js";
import { storeOperations } from "./v1/StoreDescription.js";

export const OPERATIONS = {
  ...productOperations,
  ...variantOperations,
  ...collectionOperations,
  ...inventoryOperations,
  ...orderOperations,
  ...fulfillmentOperations,
  ...customerOperations,
  ...draftOrderOperations,
  ...discountOperations,
  ...storeOperations,
};

export const DEFAULT_OPERATION = "listProducts";

export async function run(config, req) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Shopify: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, req);
  } catch (err) {
    handleError(err);
  }
}
