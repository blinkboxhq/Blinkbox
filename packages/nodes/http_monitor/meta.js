export default {
  backendType: "http_monitor",
  label: "HTTP Monitor",
  description: "Check if an HTTP endpoint is up and responding",
  fields: [
    { name: "url", label: "URL", type: "string", smart: true, placeholder: "https://api.example.com/health" },
    {
      type: "row",
      fields: [
        { name: "expectedStatus", label: "Expected Status", type: "number", min: 100, max: 599, default: 200 },
        { name: "timeout", label: "Timeout (ms)", type: "number", min: 1000, max: 30000, step: 1000, default: 10000 },
      ],
    },
  ],
  outputs: ["isUp", "status", "latencyMs", "contentType", "checkedAt"],
};
