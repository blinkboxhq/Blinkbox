export default {
  backendType: "data_diff",
  label: "Data Diff",
  description: "Deep compare two objects or arrays, detect what changed",
  fields: [
    {
      name: "operation", label: "Operation", type: "options", cols: 2, default: "diffObjects",
      options: [
        { value: "diffObjects", label: "Diff Objects" },
        { value: "diffArrays", label: "Diff Arrays" },
        { value: "findNewItems", label: "New Items" },
        { value: "findRemovedItems", label: "Removed Items" },
        { value: "findChanged", label: "Changed Items" },
      ],
    },
    {
      name: "before", label: "Before", type: "string", smart: true, multiline: true,
      placeholder: '{{ $json.previousData }}  or  {"key": "old"}',
    },
    {
      name: "after", label: "After", type: "string", smart: true, multiline: true,
      placeholder: '{{ $json.newData }}  or  {"key": "new"}',
    },
    {
      name: "key", label: "Array Key (identity field)", type: "string", smart: false, mono: true,
      placeholder: "id",
      hint: "Field used to match items between arrays",
      show: { operation: ["diffArrays", "findNewItems", "findRemovedItems", "findChanged"] },
    },
  ],
  outputs: ["added", "removed", "changed", "unchanged", "summary"],
};
