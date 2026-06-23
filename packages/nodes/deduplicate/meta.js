export default {
  backendType: "deduplicate",
  label: "Deduplicate",
  description: "Remove duplicate items from array",
  fields: [
    { name: "arrayPath", label: "Array Path", type: "string", smart: true, placeholder: "items  (blank = use entire input)" },
    { name: "field", label: "Unique Key Field", type: "string", smart: true, placeholder: "email  (blank = deep equality on whole item)", hint: "Dot-path to field used to determine uniqueness" },
    { name: "keep", label: "When Duplicate Found, Keep", type: "options", cols: 2, default: "first", options: [
      { value: "first", label: "First occurrence" },
      { value: "last", label: "Last occurrence" },
    ]},
    { name: "outputKey", label: "Output Key", type: "string", default: "items", mono: true, smart: false },
  ],
  outputs: ["items", "removedCount"],
};
