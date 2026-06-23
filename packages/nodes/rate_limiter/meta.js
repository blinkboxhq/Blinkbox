export default {
  backendType: "rate_limiter",
  label: "Rate Limiter",
  description: "Throttle workflow to N executions per window",
  fields: [
    { type: "row", fields: [
      { name: "limit", label: "Max Requests", type: "number", default: 10, min: 1 },
      { name: "window", label: "Per", type: "options", cols: 4, default: "minute", options: [
        { value: "second", label: "Second" },
        { value: "minute", label: "Minute" },
        { value: "hour", label: "Hour" },
        { value: "day", label: "Day" },
      ]},
    ]},
    { name: "strategy", label: "When Limit Exceeded", type: "options", cols: 1, default: "drop", options: [
      { value: "drop", label: "Drop — silently skip excess executions" },
      { value: "queue", label: "Queue — process when available" },
      { value: "error", label: "Error — throw and stop" },
    ]},
  ],
};
