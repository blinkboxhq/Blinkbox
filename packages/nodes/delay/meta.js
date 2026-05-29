export default {
  backendType: "delay",
  label: "Execution Delay",
  description: "Pause the workflow for a set amount of time",
  fields: [
    { type: "row", fields: [
      { name: "amount", label: "Amount", type: "number", default: 10, min: 0 },
      { name: "unit", label: "Unit", type: "options", cols: 3, default: "seconds", options: [
        { value: "seconds", label: "Seconds" },
        { value: "minutes", label: "Minutes" },
        { value: "hours",   label: "Hours" },
      ]},
    ]},
    { type: "notice", variant: "info", text: "Quick presets: 15 seconds · 1 minute · 15 minutes · 1 hour" },
  ],
};
