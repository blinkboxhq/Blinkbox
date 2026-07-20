export default {
  backendType: "wait_for_event",
  label: "Wait for Event",
  description: "Pause workflow until an external event arrives",
  fields: [
    {
      name: "type", label: "Wait For", type: "options", cols: 3, default: "webhook",
      options: [
        { value: "webhook", label: "Webhook" },
        { value: "condition", label: "Condition" },
        { value: "time", label: "Timeout Only" },
      ],
    },
    {
      name: "conditionField", label: "Condition Field", type: "string", smart: true,
      placeholder: "{{ $json.status }}",
      show: { type: "condition" },
    },
    {
      name: "conditionValue", label: "Expected Value", type: "string", smart: true,
      placeholder: "approved",
      show: { type: "condition" },
    },
    {
      name: "timeout", label: "Timeout (seconds)", type: "number", min: 60, max: 86400, default: 3600,
      hint: "Max seconds to wait before resuming with timed_out=true",
    },
  ],
  outputs: ["delayed", "resumeKey"],
};
