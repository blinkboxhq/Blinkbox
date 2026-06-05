export default {
  backendType: "stripe",
  label: "Stripe",
  description: "Manage customers, payments, charges, invoices, and products via Stripe API.",
  fields: [
    { name: "credentialId", type: "credential", label: "Stripe Credential", accentColor: "#6772E5" },
    {
      name: "operation", type: "options", label: "Operation", cols: 2, default: "listCustomers",
      options: [
        { value: "listCustomers",       label: "List Customers" },
        { value: "createCustomer",      label: "Create Customer" },
        { value: "getCustomer",         label: "Get Customer" },
        { value: "createPaymentIntent", label: "Create Payment Intent" },
        { value: "getPaymentIntent",    label: "Get Payment Intent" },
        { value: "listCharges",         label: "List Charges" },
        { value: "createRefund",        label: "Create Refund" },
        { value: "listInvoices",        label: "List Invoices" },
        { value: "createProduct",       label: "Create Product" },
        { value: "createPrice",         label: "Create Price" },
      ],
    },

    { name: "limit", type: "number", label: "Limit", default: 10, show: { operation: "listCustomers" } },
    { name: "email", type: "string", label: "Email Filter", smart: true, optional: true, placeholder: "Filter by email", show: { operation: "listCustomers" } },

    { name: "email", type: "string", label: "Email", smart: true, show: { operation: "createCustomer" } },
    { name: "name", type: "string", label: "Name", smart: true, optional: true, show: { operation: "createCustomer" } },
    { name: "phone", type: "string", label: "Phone", smart: true, optional: true, show: { operation: "createCustomer" } },
    { name: "description", type: "string", label: "Description", smart: true, optional: true, show: { operation: "createCustomer" } },
    { name: "metadata", type: "string", label: "Metadata", smart: true, optional: true, hint: "JSON object", show: { operation: "createCustomer" } },

    { name: "customerId", type: "string", label: "Customer ID", smart: true, placeholder: "cus_...", show: { operation: "getCustomer" } },

    { name: "amount", type: "string", label: "Amount", smart: true, hint: "Amount in smallest currency unit (e.g. 1000 = $10.00)", show: { operation: "createPaymentIntent" } },
    { name: "currency", type: "string", label: "Currency", smart: true, default: "usd", show: { operation: "createPaymentIntent" } },
    { name: "customerId", type: "string", label: "Customer ID", smart: true, optional: true, show: { operation: "createPaymentIntent" } },
    { name: "description", type: "string", label: "Description", smart: true, optional: true, show: { operation: "createPaymentIntent" } },
    { name: "metadata", type: "string", label: "Metadata", smart: true, optional: true, hint: "JSON object", show: { operation: "createPaymentIntent" } },

    { name: "paymentIntentId", type: "string", label: "Payment Intent ID", smart: true, placeholder: "pi_...", show: { operation: "getPaymentIntent" } },

    { name: "customerId", type: "string", label: "Customer ID", smart: true, optional: true, show: { operation: "listCharges" } },
    { name: "limit", type: "number", label: "Limit", default: 10, show: { operation: "listCharges" } },

    { name: "chargeId", type: "string", label: "Charge ID", smart: true, placeholder: "ch_...", show: { operation: "createRefund" } },
    { name: "amount", type: "string", label: "Amount", smart: true, optional: true, hint: "Partial refund amount in cents, blank = full refund", show: { operation: "createRefund" } },
    {
      name: "reason", type: "options", label: "Reason", cols: 2, optional: true,
      options: [
        { value: "duplicate",             label: "Duplicate" },
        { value: "fraudulent",            label: "Fraudulent" },
        { value: "requested_by_customer", label: "Requested by Customer" },
      ],
      show: { operation: "createRefund" },
    },

    { name: "customerId", type: "string", label: "Customer ID", smart: true, optional: true, show: { operation: "listInvoices" } },
    { name: "limit", type: "number", label: "Limit", default: 10, show: { operation: "listInvoices" } },
    {
      name: "status", type: "options", label: "Status", cols: 3, optional: true,
      options: [
        { value: "draft",          label: "Draft" },
        { value: "open",           label: "Open" },
        { value: "paid",           label: "Paid" },
        { value: "void",           label: "Void" },
        { value: "uncollectible",  label: "Uncollectible" },
      ],
      show: { operation: "listInvoices" },
    },

    { name: "name", type: "string", label: "Name", smart: true, show: { operation: "createProduct" } },
    { name: "description", type: "string", label: "Description", smart: true, optional: true, show: { operation: "createProduct" } },
    { name: "active", type: "boolean", label: "Active", default: true, show: { operation: "createProduct" } },
    { name: "metadata", type: "string", label: "Metadata", smart: true, optional: true, hint: "JSON object", show: { operation: "createProduct" } },

    { name: "productId", type: "string", label: "Product ID", smart: true, placeholder: "prod_...", show: { operation: "createPrice" } },
    { name: "unitAmount", type: "string", label: "Unit Amount", smart: true, hint: "Amount in cents (e.g. 2999 = $29.99)", show: { operation: "createPrice" } },
    { name: "currency", type: "string", label: "Currency", smart: true, default: "usd", show: { operation: "createPrice" } },
    { name: "recurring", type: "boolean", label: "Recurring", default: false, show: { operation: "createPrice" } },
    {
      name: "interval", type: "options", label: "Interval", cols: 2, default: "month",
      options: [
        { value: "day",   label: "Day" },
        { value: "week",  label: "Week" },
        { value: "month", label: "Month" },
        { value: "year",  label: "Year" },
      ],
      show: { operation: "createPrice", recurring: true },
    },
  ],
  outputs: ["customers", "customer", "paymentIntent", "charges", "invoices", "product", "price", "refund"],
};
