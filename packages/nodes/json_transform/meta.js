export default {
  backendType: "json_transform",
  label: "JSON Transform",
  description: "Parse, stringify, or extract values from JSON — no code required",
  fields: [
    {
      name: "operation", label: "Operation", type: "options", cols: 2, default: "extract",
      options: ["parse", "stringify", "extract", "keys", "values"],
      hint: "parse: text→object · stringify: object→text · extract: pull a value by path · keys/values: list an object's keys or values",
    },
    { name: "source", label: "Source", type: "string", smart: true, placeholder: "{{ $json.data }}", hint: "The value to transform (a JSON string for parse, an object for the rest)" },
    { name: "path", label: "Path", type: "string", smart: true, mono: true, placeholder: "user.address.city", hint: "Dot path for 'extract' — supports arrays e.g. items.0.id" },
    { name: "fallback", label: "Fallback", type: "string", smart: true, placeholder: "(empty)", hint: "Returned when 'extract' finds nothing at the path" },
    { name: "pretty", label: "Pretty-print", type: "boolean", default: true, hint: "Indent output for 'stringify'" },
    { name: "outputField", label: "Output Field", type: "string", smart: false, mono: true, default: "result", placeholder: "result" },
  ],
  outputs: ["result"],
};
