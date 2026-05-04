import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

async function getCreds(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "WooCommerce");
  const raw = decrypt(cred.encryptedData, cred.iv, cred.authTag);
  try {
    return JSON.parse(raw);
  } catch {
    return { consumerKey: raw, consumerSecret: "" };
  }
}

function client(storeUrl, consumerKey, consumerSecret) {
  const base = storeUrl.replace(/\/$/, "") + "/wp-json/wc/v3";
  return axios.create({
    baseURL: base,
    auth: { username: consumerKey, password: consumerSecret },
  });
}

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "listOrders";

    if (!config.credentialId) {
      return { success: false, error: "WooCommerce: credential required.", skipped: true };
    }
    if (!config.storeUrl) {
      return { success: false, error: "WooCommerce: storeUrl required.", skipped: true };
    }

    const { consumerKey, consumerSecret } = await getCreds(config.credentialId, context.workspaceId);
    if (!consumerKey) return { success: false, error: "WooCommerce: consumerKey missing in credential.", skipped: true };

    const api = client(config.storeUrl, consumerKey, consumerSecret);

    switch (operation) {
      case "listOrders": {
        const params = { per_page: Number(config.limit) || 20 };
        if (config.statusFilter && config.statusFilter !== "any") params.status = config.statusFilter;
        const { data } = await api.get("/orders", { params });
        return { success: true, orders: data };
      }

      case "getOrder": {
        if (!config.orderId) return { success: false, error: "WooCommerce: orderId required.", skipped: true };
        const { data } = await api.get(`/orders/${config.orderId}`);
        return { success: true, ...data };
      }

      case "updateOrder": {
        if (!config.orderId) return { success: false, error: "WooCommerce: orderId required.", skipped: true };
        if (!config.status) return { success: false, error: "WooCommerce: status required.", skipped: true };
        const { data } = await api.put(`/orders/${config.orderId}`, { status: config.status });
        return { success: true, ...data };
      }

      case "listProducts": {
        const { data } = await api.get("/products", {
          params: { per_page: Number(config.limit) || 20 },
        });
        return { success: true, products: data };
      }

      case "getProduct": {
        if (!config.productId) return { success: false, error: "WooCommerce: productId required.", skipped: true };
        const { data } = await api.get(`/products/${config.productId}`);
        return { success: true, ...data };
      }

      case "createProduct": {
        if (!config.name) return { success: false, error: "WooCommerce: name required.", skipped: true };
        const body = { name: config.name, type: "simple", status: "publish" };
        if (config.regularPrice) body.regular_price = String(config.regularPrice);
        if (config.description) body.description = config.description;
        if (config.stockQuantity !== undefined && config.stockQuantity !== "") {
          body.manage_stock = true;
          body.stock_quantity = Number(config.stockQuantity);
        }
        const { data } = await api.post("/products", body);
        return { success: true, ...data };
      }

      case "updateProduct": {
        if (!config.productId) return { success: false, error: "WooCommerce: productId required.", skipped: true };
        const body = {};
        if (config.name) body.name = config.name;
        if (config.regularPrice) body.regular_price = String(config.regularPrice);
        if (config.description) body.description = config.description;
        if (config.stockQuantity !== undefined && config.stockQuantity !== "") {
          body.manage_stock = true;
          body.stock_quantity = Number(config.stockQuantity);
        }
        const { data } = await api.put(`/products/${config.productId}`, body);
        return { success: true, ...data };
      }

      case "listCustomers": {
        const { data } = await api.get("/customers", {
          params: { per_page: Number(config.limit) || 20 },
        });
        return { success: true, customers: data };
      }

      case "getCustomer": {
        const customerId = config.customerId || config.id;
        if (!customerId) return { success: false, error: "WooCommerce: customerId required.", skipped: true };
        const { data } = await api.get(`/customers/${customerId}`);
        return { success: true, ...data };
      }

      case "createCoupon": {
        if (!config.code) return { success: false, error: "WooCommerce: code required.", skipped: true };
        const body = {
          code: config.code,
          discount_type: config.discountType || "percent",
          amount: String(config.amount || "0"),
        };
        if (config.dateExpires) body.date_expires = config.dateExpires;
        const { data } = await api.post("/coupons", body);
        return { success: true, ...data };
      }

      default:
        return { success: false, error: `WooCommerce: Unknown operation "${operation}".`, skipped: true };
    }
  },
};
