export default {
  backendType: "merge",
  label: "Merge",
  description: "Combine outputs from parallel branches",
  fields: [
    { name: "mode", label: "Merge Mode", type: "options", cols: 1, default: "combine", options: [
      { value: "combine", label: "Combine — shallow-merge all fields into one object" },
      { value: "array",   label: "Array — wrap each branch as an array element" },
      { value: "first",   label: "First — keep only the first non-empty branch" },
    ]},
    { name: "key", label: "Array Key", type: "string", default: "merged", mono: true, smart: false, show: { mode: "array" } },
  ],
};
