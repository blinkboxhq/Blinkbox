export default {
  backendType: "aggregate",
  label: "Aggregate",
  description: "Collect N items from a loop then emit as a batch",
  fields: [
    { name: "expectedCount", label: "Expected Count", type: "string", smart: true, placeholder: "{{loop.totalItems}} or 10", hint: "How many items to collect before emitting the batch" },
    { name: "sessionId", label: "Session ID", type: "string", smart: true, placeholder: "{{trigger.messageId}}-batch", hint: "Unique per loop run to separate concurrent batches" },
    { name: "aggregateKey", label: "Collect Field (optional)", type: "string", smart: false, mono: true, placeholder: "result  (blank = collect entire item)" },
    { name: "ttlSeconds", label: "TTL (seconds)", type: "number", default: 300, min: 10, max: 3600, hint: "Auto-clear partial batches after this many seconds" },
  ],
  outputs: ["items", "count", "sessionId", "completedAt"],
};
