import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

async function getCreds(credentialId, workspaceId) {
  const raw = await getOAuthToken(credentialId, workspaceId, "WooCommerce");
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
    timeout: 20000,
  });
}

function handleError(err) {
  if (err.message?.startsWith("WooCommerce")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message ?? err.response?.data?.code ?? err.message;
  if (status === 401) throw new Error(`WooCommerce: Authentication failed — check consumer key and secret.`);
  if (status === 403) throw new Error(`WooCommerce: Permission denied — ${msg}`);
  if (status === 404) throw new Error(`WooCommerce: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`WooCommerce: Bad request — ${msg}`);
  if (status === 422) throw new Error(`WooCommerce: Validation error — ${msg}`);
  if (status === 429) throw new Error(`WooCommerce: Rate limit exceeded — slow down requests.`);
  throw new Error(`WooCommerce: ${status ?? "Error"} — ${msg}`);
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

    try {
      switch (operation) {
        case "listOrders": {
          const params = { per_page: Math.min(Number(config.limit) || 20, 100) };
          if (config.statusFilter && config.statusFilter !== "any") params.status = config.statusFilter;
          const { data } = await api.get("/orders", { params });
          return { success: true, orders: data, count: data.length };
        }

        case "getOrder": {
          if (!config.orderId) return { success: false, error: "WooCommerce getOrder: 'orderId' is required.", skipped: true };
          const { data } = await api.get(`/orders/${config.orderId}`);
          return { success: true, id: data.id, status: data.status, total: data.total, currency: data.currency, billing: data.billing, line_items: data.line_items };
        }

        case "updateOrder": {
          if (!config.orderId) return { success: false, error: "WooCommerce updateOrder: 'orderId' is required.", skipped: true };
          if (!config.status) return { success: false, error: "WooCommerce updateOrder: 'status' is required.", skipped: true };
          const { data } = await api.put(`/orders/${config.orderId}`, { status: config.status });
          return { success: true, id: data.id, status: data.status, updated: true };
        }

        case "listProducts": {
          const { data } = await api.get("/products", {
            params: { per_page: Math.min(Number(config.limit) || 20, 100) },
          });
          return { success: true, products: data, count: data.length };
        }

        case "getProduct": {
          if (!config.productId) return { success: false, error: "WooCommerce getProduct: 'productId' is required.", skipped: true };
          const { data } = await api.get(`/products/${config.productId}`);
          return { success: true, id: data.id, name: data.name, status: data.status, price: data.price, regular_price: data.regular_price, stock_quantity: data.stock_quantity };
        }

        case "createProduct": {
          if (!config.name) return { success: false, error: "WooCommerce createProduct: 'name' is required.", skipped: true };
          const body = { name: config.name, type: "simple", status: "publish" };
          if (config.regularPrice) body.regular_price = String(config.regularPrice);
          if (config.description) body.description = config.description;
          if (config.stockQuantity !== undefined && config.stockQuantity !== "") {
            body.manage_stock = true;
            body.stock_quantity = Number(config.stockQuantity);
          }
          const { data } = await api.post("/products", body);
          return { success: true, id: data.id, name: data.name, status: data.status, price: data.price };
        }

        case "updateProduct": {
          if (!config.productId) return { success: false, error: "WooCommerce updateProduct: 'productId' is required.", skipped: true };
          const body = {};
          if (config.name) body.name = config.name;
          if (config.regularPrice) body.regular_price = String(config.regularPrice);
          if (config.description) body.description = config.description;
          if (config.stockQuantity !== undefined && config.stockQuantity !== "") {
            body.manage_stock = true;
            body.stock_quantity = Number(config.stockQuantity);
          }
          const { data } = await api.put(`/products/${config.productId}`, body);
          return { success: true, id: data.id, name: data.name, updated: true };
        }

        case "listCustomers": {
          const { data } = await api.get("/customers", {
            params: { per_page: Math.min(Number(config.limit) || 20, 100) },
          });
          return { success: true, customers: data, count: data.length };
        }

        case "getCustomer": {
          const customerId = config.customerId || config.id;
          if (!customerId) return { success: false, error: "WooCommerce getCustomer: 'customerId' is required.", skipped: true };
          const { data } = await api.get(`/customers/${customerId}`);
          return { success: true, id: data.id, email: data.email, first_name: data.first_name, last_name: data.last_name, orders_count: data.orders_count, total_spent: data.total_spent };
        }

        case "createCoupon": {
          if (!config.code) return { success: false, error: "WooCommerce createCoupon: 'code' is required.", skipped: true };
          const body = {
            code: config.code,
            discount_type: config.discountType || "percent",
            amount: String(config.amount || "0"),
          };
          if (config.dateExpires) body.date_expires = config.dateExpires;
          const { data } = await api.post("/coupons", body);
          return { success: true, id: data.id, code: data.code, discount_type: data.discount_type, amount: data.amount };
        }

        default:
          throw new Error(`WooCommerce: Unknown operation "${operation}".`);
      }
    } catch (err) { handleError(err); }
  },
};
