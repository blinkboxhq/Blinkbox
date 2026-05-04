import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "listOrders";
    const siteUrl = (config.siteUrl || input.siteUrl || "").replace(/\/$/, "");
    if (!siteUrl) return { success: false, error: "WooCommerce: 'siteUrl' is required.", skipped: true };

    let ck = config.consumerKey, cs = config.consumerSecret;
    if (config.credentialId) {
      const cred = await resolveCredential(config.credentialId, context.workspaceId, "WooCommerce");
      const raw = decrypt(cred.encryptedData, cred.iv, cred.authTag);
      try { const j = JSON.parse(raw); ck = j.consumerKey; cs = j.consumerSecret; } catch { ck = raw; }
    }
    if (!ck || !cs) return { success: false, error: "WooCommerce: consumerKey and consumerSecret required.", skipped: true };

    const BASE = `${siteUrl}/wp-json/wc/v3`;
    const auth = { username: ck, password: cs };

    switch (operation) {
      case "listOrders": {
        const { data } = await axios.get(`${BASE}/orders`, { auth, params: { per_page: config.limit || 20, status: config.status || "any", page: config.page || 1 }, timeout: 15000 });
        return { orders: data, count: data.length };
      }
      case "getOrder": {
        const id = config.orderId || input.orderId;
        if (!id) return { success: false, error: "WooCommerce getOrder: 'orderId' required.", skipped: true };
        const { data } = await axios.get(`${BASE}/orders/${id}`, { auth, timeout: 10000 });
        return data;
      }
      case "updateOrder": {
        const id = config.orderId || input.orderId;
        if (!id) return { success: false, error: "WooCommerce updateOrder: 'orderId' required.", skipped: true };
        const update = {};
        if (config.status) update.status = config.status;
        if (config.note) update.customer_note = config.note;
        const { data } = await axios.put(`${BASE}/orders/${id}`, update, { auth, timeout: 10000 });
        return data;
      }
      case "listProducts": {
        const { data } = await axios.get(`${BASE}/products`, { auth, params: { per_page: config.limit || 20, category: config.categoryId, search: config.search, page: config.page || 1 }, timeout: 15000 });
        return { products: data, count: data.length };
      }
      case "getProduct": {
        const id = config.productId || input.productId;
        if (!id) return { success: false, error: "WooCommerce getProduct: 'productId' required.", skipped: true };
        const { data } = await axios.get(`${BASE}/products/${id}`, { auth, timeout: 10000 });
        return data;
      }
      case "createProduct": {
        const body = { name: config.name || "New Product", regular_price: String(config.price || "0"), description: config.description || "", type: config.type || "simple", status: config.status || "draft" };
        const { data } = await axios.post(`${BASE}/products`, body, { auth, timeout: 15000 });
        return data;
      }
      case "updateProduct": {
        const id = config.productId || input.productId;
        if (!id) return { success: false, error: "WooCommerce updateProduct: 'productId' required.", skipped: true };
        const update = {};
        if (config.name) update.name = config.name;
        if (config.price) update.regular_price = String(config.price);
        if (config.status) update.status = config.status;
        if (config.stock !== undefined) { update.manage_stock = true; update.stock_quantity = config.stock; }
        const { data } = await axios.put(`${BASE}/products/${id}`, update, { auth, timeout: 10000 });
        return data;
      }
      case "listCustomers": {
        const { data } = await axios.get(`${BASE}/customers`, { auth, params: { per_page: config.limit || 20, role: config.role || "all", search: config.search }, timeout: 15000 });
        return { customers: data, count: data.length };
      }
      default:
        return { success: false, error: `WooCommerce: Unknown operation "${operation}".`, skipped: true };
    }
  },
};
