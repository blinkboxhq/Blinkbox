export default {
  backendType: "regex_match",
  label: "Regex Match",
  description: "Test or extract with a regular expression",
  fields: [
    { name: "field",   label: "Input Field", type: "string", smart: true, placeholder: "{{ $json.text }}" },
    { name: "pattern", label: "Pattern",     type: "string", smart: false, mono: true, placeholder: "\\d+" },
    { name: "flags",   label: "Flags",       type: "string", smart: false, mono: true, default: "gi", placeholder: "gi" },
    {
      name: "mode", label: "Mode", type: "options", cols: 3, default: "test",
      options: [
        { value: "test",    label: "Test (true/false)" },
        { value: "match",   label: "Match All" },
        { value: "extract", label: "Extract Group" },
      ],
    },
    {
      name: "group", label: "Capture Group", type: "number", min: 0, default: 0,
      hint: "0 = full match, 1+ = capture group index",
      show: { mode: "extract" },
    },
    { name: "outputField", label: "Output Field", type: "string", smart: false, mono: true, default: "result", placeholder: "result" },
  ],
  outputs: ["result"],
};
