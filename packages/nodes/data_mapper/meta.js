export default {
  backendType: "data_mapper",
  label: "Data Mapper",
  description: "Set, rename, filter, remove or pick fields on the incoming payload",
  fields: [
    {
      name: "fields", label: "Fields to Set", type: "keyValue", show: { operation: "set" },
      keyName: "key", valueName: "value",
      keyPlaceholder: "fullName", valuePlaceholder: "{{ $json.first }} {{ $json.last }}",
      addLabel: "Add field",
    },
    {
      name: "mappings", label: "Rename", type: "keyValue", show: { operation: "rename" },
      keyName: "from", valueName: "to",
      keyPlaceholder: "old_name", valuePlaceholder: "newName",
      addLabel: "Add rename",
    },
    {
      name: "keys", label: "Fields to Remove", type: "list", show: { operation: "remove" },
      placeholder: "internalId", addLabel: "Add field",
    },
    {
      name: "keys", label: "Fields to Keep", type: "list", show: { operation: "pick" },
      placeholder: "email", addLabel: "Add field",
      hint: "Everything not listed here is dropped",
    },
    {
      name: "arrayPath", label: "Array Path", type: "string", smart: false, mono: true,
      placeholder: "items  (blank = auto-detect)", show: { operation: "filter" },
      hint: "Dot path to the array. Blank checks findings, items, then data.",
    },
    {
      name: "field", label: "Compare Field", type: "string", smart: false, mono: true,
      default: "content", placeholder: "status", show: { operation: "filter" },
    },
    {
      name: "operator", label: "Condition", type: "options", cols: 2, default: "contains",
      show: { operation: "filter" },
      options: [
        { value: "contains",     label: "Contains" },
        { value: "not_contains", label: "Does not contain" },
        { value: "equals",       label: "Equals" },
        { value: "starts_with",  label: "Starts with" },
        { value: "ends_with",    label: "Ends with" },
        { value: "gt",           label: "Greater than" },
        { value: "lt",           label: "Less than" },
      ],
    },
    {
      name: "value", label: "Compare Value", type: "string", smart: true,
      placeholder: "active  or  {{ $json.target }}", show: { operation: "filter" },
    },
  ],
  outputs: ["mapped payload"],
};
