export default {
  backendType: "woocommerce",
  label: "WooCommerce",
  description: "Manage products, orders, customers, and coupons in your WooCommerce store.",
  fields: [
    { name: "credentialId", type: "credential", label: "WooCommerce Credential", accentColor: "#96588A" },
    { name: "siteUrl", type: "string", label: "Site URL", smart: false, placeholder: "https://yourstore.com" },
    {
      name: "operation", type: "options", label: "Operation", cols: 2, default: "listProducts",
      options: [
        { value: "listProducts",  label: "List Products" },
        { value: "getProduct",    label: "Get Product" },
        { value: "createProduct", label: "Create Product" },
        { value: "updateProduct", label: "Update Product" },
        { value: "listOrders",    label: "List Orders" },
        { value: "getOrder",      label: "Get Order" },
        { value: "updateOrder",   label: "Update Order" },
        { value: "listCustomers", label: "List Customers" },
        { value: "getCustomer",   label: "Get Customer" },
        { value: "createCoupon",  label: "Create Coupon" },
      ],
    },

    { name: "perPage", type: "number", label: "Per Page", default: 20, show: { operation: "listProducts" } },
    {
      name: "status", type: "options", label: "Status", cols: 2, default: "publish",
      options: [
        { value: "any",     label: "Any" },
        { value: "publish", label: "Published" },
        { value: "draft",   label: "Draft" },
        { value: "pending", label: "Pending" },
      ],
      show: { operation: "listProducts" },
    },
    { name: "search", type: "string", label: "Search", smart: true, optional: true, show: { operation: "listProducts" } },

    { name: "productId", type: "string", label: "Product ID", smart: true, show: { operation: ["getProduct", "updateProduct"] } },

    { name: "name", type: "string", label: "Name", smart: true, show: { operation: "createProduct" } },
    {
      name: "type", type: "options", label: "Type", cols: 2, default: "simple",
      options: [
        { value: "simple",   label: "Simple" },
        { value: "grouped",  label: "Grouped" },
        { value: "external", label: "External" },
        { value: "variable", label: "Variable" },
      ],
      show: { operation: "createProduct" },
    },
    { name: "regularPrice", type: "string", label: "Regular Price", smart: true, show: { operation: "createProduct" } },
    { name: "description", type: "string", label: "Description", smart: true, multiline: true, optional: true, show: { operation: "createProduct" } },
    {
      name: "status", type: "options", label: "Status", cols: 2, default: "publish",
      options: [
        { value: "publish", label: "Published" },
        { value: "draft",   label: "Draft" },
      ],
      show: { operation: "createProduct" },
    },
    { name: "sku", type: "string", label: "SKU", smart: true, optional: true, show: { operation: "createProduct" } },

    { name: "name", type: "string", label: "Name", smart: true, optional: true, show: { operation: "updateProduct" } },
    { name: "regularPrice", type: "string", label: "Regular Price", smart: true, optional: true, show: { operation: "updateProduct" } },
    {
      name: "status", type: "options", label: "Status", cols: 3,
      options: [
        { value: "publish", label: "Published" },
        { value: "draft",   label: "Draft" },
        { value: "pending", label: "Pending" },
      ],
      show: { operation: "updateProduct" },
    },
    {
      name: "stockStatus", type: "options", label: "Stock Status", cols: 3,
      options: [
        { value: "instock",    label: "In Stock" },
        { value: "outofstock", label: "Out of Stock" },
        { value: "onbackorder",label: "On Backorder" },
      ],
      show: { operation: "updateProduct" },
    },

    { name: "perPage", type: "number", label: "Per Page", default: 20, show: { operation: "listOrders" } },
    {
      name: "status", type: "options", label: "Status", cols: 2, default: "processing",
      options: [
        { value: "any",        label: "Any" },
        { value: "pending",    label: "Pending" },
        { value: "processing", label: "Processing" },
        { value: "on-hold",    label: "On Hold" },
        { value: "completed",  label: "Completed" },
        { value: "cancelled",  label: "Cancelled" },
        { value: "refunded",   label: "Refunded" },
      ],
      show: { operation: "listOrders" },
    },

    { name: "orderId", type: "string", label: "Order ID", smart: true, show: { operation: ["getOrder", "updateOrder"] } },

    {
      name: "status", type: "options", label: "Status", cols: 2,
      options: [
        { value: "pending",    label: "Pending" },
        { value: "processing", label: "Processing" },
        { value: "on-hold",    label: "On Hold" },
        { value: "completed",  label: "Completed" },
        { value: "cancelled",  label: "Cancelled" },
        { value: "refunded",   label: "Refunded" },
      ],
      show: { operation: "updateOrder" },
    },
    { name: "note", type: "string", label: "Order Note", smart: true, optional: true, show: { operation: "updateOrder" } },

    { name: "perPage", type: "number", label: "Per Page", default: 20, show: { operation: "listCustomers" } },
    { name: "search", type: "string", label: "Search", smart: true, optional: true, show: { operation: "listCustomers" } },

    { name: "customerId", type: "string", label: "Customer ID", smart: true, show: { operation: "getCustomer" } },

    { name: "code", type: "string", label: "Coupon Code", smart: true, show: { operation: "createCoupon" } },
    {
      name: "discountType", type: "options", label: "Discount Type", cols: 3, default: "percent",
      options: [
        { value: "percent",      label: "Percent" },
        { value: "fixed_cart",   label: "Fixed Cart" },
        { value: "fixed_product",label: "Fixed Product" },
      ],
      show: { operation: "createCoupon" },
    },
    { name: "amount", type: "string", label: "Amount", smart: true, placeholder: "10", show: { operation: "createCoupon" } },
    { name: "expiryDate", type: "string", label: "Expiry Date", smart: true, optional: true, placeholder: "2024-12-31", show: { operation: "createCoupon" } },
    { name: "usageLimit", type: "number", label: "Usage Limit", optional: true, show: { operation: "createCoupon" } },
  ],
  outputs: ["products", "product", "orders", "order", "customers", "coupon"],
};
