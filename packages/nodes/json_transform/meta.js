export default {
  backendType: "json_transform",
  label: "JSON Transform",
  description: "Parse, stringify, or extract values from JSON — no code required",
  fields: [
    { name: "source", label: "Source", type: "string", smart: true, placeholder: "{{ $json.data }}", hint: "The value to transform (a JSON string for parse, an object for the rest)" },
    { name: "path", label: "Path", type: "string", smart: true, mono: true, placeholder: "user.address.city", hint: "Dot path — supports arrays e.g. items.0.id", show: { operation: "extract" } },
    { name: "fallback", label: "Fallback", type: "string", smart: true, placeholder: "(empty)", hint: "Returned when nothing is found at the path", show: { operation: "extract" } },
    { name: "pretty", label: "Pretty-print", type: "boolean", default: true, hint: "Indent the output", show: { operation: "stringify" } },
    { name: "outputField", label: "Output Field", type: "string", smart: false, mono: true, default: "result", placeholder: "result" },
  ],
  outputs: ["result"],
};
