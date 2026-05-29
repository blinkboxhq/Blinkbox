export default {
  backendType: "find_replace",
  label: "Find & Replace",
  description: "Search and substitute text",
  fields: [
    { name: "field",   label: "Input Field",  type: "string", smart: true, placeholder: "{{ $json.text }}" },
    { name: "find",    label: "Find",         type: "string", smart: true, placeholder: "old text or regex" },
    { name: "replace", label: "Replace With", type: "string", smart: true, placeholder: "new text or $1 for groups" },
    { name: "useRegex", label: "Use Regex", type: "boolean", default: false,
      hint: "Treat the find value as a regular expression" },
    { name: "flags", label: "Flags", type: "string", smart: false, mono: true, default: "gi",
      show: { useRegex: true } },
    { name: "outputField", label: "Output Field", type: "string", smart: false, mono: true, default: "result", placeholder: "result" },
  ],
  outputs: ["result"],
};
