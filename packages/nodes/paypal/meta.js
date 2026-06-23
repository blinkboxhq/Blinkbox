export default {
  backendType: "paypal",
  label: "PayPal",
  description: "Create and capture orders, issue refunds, send payouts, and list transactions via PayPal REST API.",
  fields: [
    { name: "credentialId", type: "credential", label: "PayPal Credential", accentColor: "#003087" },
    { type: "notice", level: "warning", text: "Use PayPal REST API client_id:client_secret credential" },
    {
      name: "operation", type: "options", label: "Operation", cols: 2, default: "createOrder",
      options: [
        { value: "createOrder",       label: "Create Order" },
        { value: "captureOrder",      label: "Capture Order" },
        { value: "getOrder",          label: "Get Order" },
        { value: "refundCapture",     label: "Refund Capture" },
        { value: "createPayout",      label: "Create Payout" },
        { value: "listTransactions",  label: "List Transactions" },
        { value: "getBalance",        label: "Get Balance" },
      ],
    },

    { name: "amount", type: "string", label: "Amount", smart: true, hint: "Amount as string: 10.00", show: { operation: "createOrder" } },
    { name: "currency", type: "string", label: "Currency", smart: true, default: "USD", show: { operation: "createOrder" } },
    { name: "description", type: "string", label: "Description", smart: true, optional: true, show: { operation: "createOrder" } },
    { name: "returnUrl", type: "string", label: "Return URL", smart: true, optional: true, show: { operation: "createOrder" } },
    { name: "cancelUrl", type: "string", label: "Cancel URL", smart: true, optional: true, show: { operation: "createOrder" } },

    { name: "orderId", type: "string", label: "Order ID", smart: true, placeholder: "PayPal order ID", show: { operation: ["captureOrder", "getOrder"] } },

    { name: "captureId", type: "string", label: "Capture ID", smart: true, placeholder: "PayPal capture ID", show: { operation: "refundCapture" } },
    { name: "amount", type: "string", label: "Refund Amount", smart: true, optional: true, hint: "Partial refund amount, blank = full", show: { operation: "refundCapture" } },
    { name: "currency", type: "string", label: "Currency", smart: true, optional: true, show: { operation: "refundCapture" } },
    { name: "note", type: "string", label: "Note", smart: true, optional: true, show: { operation: "refundCapture" } },

    { name: "receiverEmail", type: "string", label: "Receiver Email", smart: true, show: { operation: "createPayout" } },
    { name: "amount", type: "string", label: "Amount", smart: true, show: { operation: "createPayout" } },
    { name: "currency", type: "string", label: "Currency", smart: true, default: "USD", show: { operation: "createPayout" } },
    { name: "note", type: "string", label: "Note", smart: true, optional: true, show: { operation: "createPayout" } },
    { name: "senderItemId", type: "string", label: "Sender Item ID", smart: true, optional: true, show: { operation: "createPayout" } },

    { name: "startDate", type: "string", label: "Start Date", smart: true, placeholder: "2024-01-01", show: { operation: "listTransactions" } },
    { name: "endDate", type: "string", label: "End Date", smart: true, placeholder: "2024-12-31", show: { operation: "listTransactions" } },
    {
      name: "transactionStatus", type: "options", label: "Transaction Status", cols: 3, optional: true, hint: "S=Success P=Pending V=Reversed",
      options: [
        { value: "S", label: "S — Success" },
        { value: "P", label: "P — Pending" },
        { value: "V", label: "V — Reversed" },
        { value: "F", label: "F — Failed" },
        { value: "D", label: "D — Denied" },
        { value: "R", label: "R — Partially Refunded" },
        { value: "I", label: "I — Processing" },
        { value: "B", label: "B — Review" },
        { value: "N", label: "N — No Status" },
        { value: "U", label: "U — Unknown" },
      ],
      show: { operation: "listTransactions" },
    },
  ],
  outputs: ["order", "capture", "refund", "payout", "transactions", "balance"],
};
