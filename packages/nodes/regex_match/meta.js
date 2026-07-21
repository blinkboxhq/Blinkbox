export default {
  backendType: "regex_match",
  label: "Regex Match",
  description: "Test or extract with a regular expression",
  fields: [
    { name: "field",   label: "Input Field", type: "string", smart: true, placeholder: "{{ $json.text }}" },
    { name: "pattern", label: "Pattern",     type: "string", smart: false, mono: true, placeholder: "\\d+", required: true },
    { name: "flags",   label: "Flags",       type: "string", smart: false, mono: true, default: "gi", placeholder: "gi" },
    {
      name: "group", label: "Capture Group", type: "number", min: 0, default: 0,
      hint: "0 = full match, 1+ = capture group index",
      show: { operation: "extract" },
    },
    { name: "outputField", label: "Output Field", type: "string", smart: false, mono: true, default: "result", placeholder: "result" },
  ],
  outputs: ["result", "matched", "count"],
};
