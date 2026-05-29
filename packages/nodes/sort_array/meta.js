export default {
  backendType: "sort_array",
  label: "Sort Array",
  description: "Sort items by a field value",
  fields: [
    { name: "arrayPath", label: "Array Path", type: "string", smart: true, placeholder: "items  (blank = use entire input)" },
    { name: "field", label: "Sort By Field", type: "string", smart: true, placeholder: "createdAt  (dot-path within each item)" },
    { name: "direction", label: "Direction", type: "options", cols: 2, default: "asc", options: [
      { value: "asc",  label: "Ascending (A→Z)" },
      { value: "desc", label: "Descending (Z→A)" },
    ]},
    { name: "type", label: "Type", type: "options", cols: 4, default: "auto", options: [
      { value: "auto",   label: "Auto" },
      { value: "string", label: "String" },
      { value: "number", label: "Number" },
      { value: "date",   label: "Date" },
    ]},
    { name: "outputKey", label: "Output Key", type: "string", default: "items", mono: true, smart: false },
  ],
  outputs: ["items", "count"],
};
