export default {
  backendType: "retry",
  label: "Retry",
  description: "Retry the previous node on failure",
  fields: [
    { name: "maxRetries", label: "Max Retries", type: "number", default: 3, min: 1, max: 10 },
    { name: "delayMs", label: "Delay Between Retries (ms)", type: "number", default: 1000, min: 0, step: 500 },
    { name: "backoff", label: "Backoff Strategy", type: "options", cols: 2, default: "fixed", options: [
      { value: "fixed", label: "Fixed" },
      { value: "exponential", label: "Exponential" },
    ]},
  ],
};
