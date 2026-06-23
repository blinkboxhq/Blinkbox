export default {
  backendType: "shopify",
  label: "Shopify",
  description: "Manage products, orders, and customers in your Shopify store.",
  fields: [
    { name: "credentialId", type: "credential", label: "Shopify Credential", accentColor: "#96BF48" },
    { name: "shop", type: "string", label: "Shop Domain", smart: false, placeholder: "yourstore.myshopify.com" },
    {
      name: "operation", type: "options", label: "Operation", cols: 2, default: "listProducts",
      options: [
        { value: "listProducts",    label: "List Products" },
        { value: "getProduct",      label: "Get Product" },
        { value: "createProduct",   label: "Create Product" },
        { value: "updateProduct",   label: "Update Product" },
        { value: "listOrders",      label: "List Orders" },
        { value: "getOrder",        label: "Get Order" },
        { value: "updateOrder",     label: "Update Order" },
        { value: "listCustomers",   label: "List Customers" },
        { value: "getCustomer",     label: "Get Customer" },
        { value: "createCustomer",  label: "Create Customer" },
      ],
    },

    { name: "limit", type: "number", label: "Limit", default: 50, show: { operation: "listProducts" } },
    {
      name: "status", type: "options", label: "Status", cols: 3, default: "active",
      options: [
        { value: "active",   label: "Active" },
        { value: "archived", label: "Archived" },
        { value: "draft",    label: "Draft" },
      ],
      show: { operation: "listProducts" },
    },
    { name: "collectionId", type: "string", label: "Collection ID", smart: true, optional: true, show: { operation: "listProducts" } },

    { name: "productId", type: "string", label: "Product ID", smart: true, show: { operation: ["getProduct", "updateProduct"] } },

    { name: "title", type: "string", label: "Title", smart: true, show: { operation: "createProduct" } },
    { name: "bodyHtml", type: "string", label: "Description (HTML)", smart: true, multiline: true, optional: true, show: { operation: "createProduct" } },
    { name: "vendor", type: "string", label: "Vendor", smart: true, optional: true, show: { operation: "createProduct" } },
    { name: "productType", type: "string", label: "Product Type", smart: true, optional: true, show: { operation: "createProduct" } },
    {
      name: "status", type: "options", label: "Status", cols: 2, default: "active",
      options: [
        { value: "active", label: "Active" },
        { value: "draft",  label: "Draft" },
      ],
      show: { operation: "createProduct" },
    },
    { name: "tags", type: "string", label: "Tags", smart: true, optional: true, hint: "Comma-separated", show: { operation: "createProduct" } },
    { name: "variants", type: "string", label: "Variants", smart: true, multiline: true, optional: true, hint: "JSON array of variant objects", show: { operation: "createProduct" } },

    { name: "title", type: "string", label: "Title", smart: true, optional: true, show: { operation: "updateProduct" } },
    { name: "bodyHtml", type: "string", label: "Description (HTML)", smart: true, multiline: true, optional: true, show: { operation: "updateProduct" } },
    {
      name: "status", type: "options", label: "Status", cols: 3,
      options: [
        { value: "active",   label: "Active" },
        { value: "archived", label: "Archived" },
        { value: "draft",    label: "Draft" },
      ],
      show: { operation: "updateProduct" },
    },
    { name: "tags", type: "string", label: "Tags", smart: true, optional: true, show: { operation: "updateProduct" } },

    { name: "limit", type: "number", label: "Limit", default: 50, show: { operation: "listOrders" } },
    {
      name: "status", type: "options", label: "Status", cols: 2, default: "open",
      options: [
        { value: "open",      label: "Open" },
        { value: "closed",    label: "Closed" },
        { value: "cancelled", label: "Cancelled" },
        { value: "any",       label: "Any" },
      ],
      show: { operation: "listOrders" },
    },
    {
      name: "financialStatus", type: "options", label: "Financial Status", cols: 2, optional: true,
      options: [
        { value: "paid",     label: "Paid" },
        { value: "pending",  label: "Pending" },
        { value: "refunded", label: "Refunded" },
        { value: "any",      label: "Any" },
      ],
      show: { operation: "listOrders" },
    },

    { name: "orderId", type: "string", label: "Order ID", smart: true, show: { operation: ["getOrder", "updateOrder"] } },

    { name: "note", type: "string", label: "Note", smart: true, optional: true, show: { operation: "updateOrder" } },
    { name: "tags", type: "string", label: "Tags", smart: true, optional: true, show: { operation: "updateOrder" } },
    { name: "email", type: "string", label: "Email", smart: true, optional: true, show: { operation: "updateOrder" } },

    { name: "limit", type: "number", label: "Limit", default: 50, show: { operation: "listCustomers" } },
    { name: "query", type: "string", label: "Search Query", smart: true, optional: true, placeholder: "email:john@...", show: { operation: "listCustomers" } },

    { name: "customerId", type: "string", label: "Customer ID", smart: true, show: { operation: "getCustomer" } },

    { name: "firstName", type: "string", label: "First Name", smart: true, show: { operation: "createCustomer" } },
    { name: "lastName", type: "string", label: "Last Name", smart: true, show: { operation: "createCustomer" } },
    { name: "email", type: "string", label: "Email", smart: true, show: { operation: "createCustomer" } },
    { name: "phone", type: "string", label: "Phone", smart: true, optional: true, show: { operation: "createCustomer" } },
    { name: "tags", type: "string", label: "Tags", smart: true, optional: true, show: { operation: "createCustomer" } },
  ],
  outputs: ["products", "product", "orders", "order", "customers", "customer"],
};
