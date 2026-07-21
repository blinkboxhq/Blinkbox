export default {
  backendType: "text_format",
  label: "Text Format",
  description: "Transform and format text values",
  fields: [
    { name: "field", label: "Input Field", type: "string", smart: true, placeholder: "{{ $json.name }}" },
    {
      type: "row", show: { operation: "truncate" },
      fields: [
        { name: "length", label: "Max Length", type: "number", min: 1, default: 100 },
        { name: "suffix", label: "Suffix", type: "string", smart: false, default: "..." },
      ],
    },
    {
      type: "row", show: { operation: ["pad_start", "pad_end"] },
      fields: [
        { name: "padLength", label: "Length", type: "number", min: 1, default: 10 },
        { name: "padChar",   label: "Pad Char", type: "string", smart: false, mono: true, default: " " },
      ],
    },
    { name: "outputField", label: "Output Field", type: "string", smart: false, mono: true, placeholder: "result", default: "result" },
  ],
  outputs: ["result"],
};
