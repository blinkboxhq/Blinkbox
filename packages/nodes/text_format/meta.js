export default {
  backendType: "text_format",
  label: "Text Format",
  description: "Transform and format text values",
  fields: [
    { name: "field", label: "Input Field", type: "string", smart: true, placeholder: "{{ $json.name }}" },
    {
      name: "operation", label: "Operation", type: "options", cols: 2, default: "uppercase",
      options: [
        { value: "uppercase",   label: "UPPERCASE" },
        { value: "lowercase",   label: "lowercase" },
        { value: "titlecase",   label: "Title Case" },
        { value: "trim",        label: "Trim" },
        { value: "trim_start",  label: "Trim Start" },
        { value: "trim_end",    label: "Trim End" },
        { value: "slug",        label: "Slug" },
        { value: "truncate",    label: "Truncate" },
        { value: "pad_start",   label: "Pad Start" },
        { value: "pad_end",     label: "Pad End" },
        { value: "reverse",     label: "Reverse" },
        { value: "remove_html", label: "Strip HTML" },
      ],
    },
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
