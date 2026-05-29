export default {
  backendType: "base64",
  label: "Base64 Encode / Decode",
  description: "Encode text, URLs or binary to/from Base64",
  fields: [
    {
      name: "mode", label: "Action", type: "options", cols: 2, default: "encode",
      options: [
        { value: "encode", label: "Encode → Base64" },
        { value: "decode", label: "Decode ← Base64" },
      ],
    },
    { name: "input", label: "Input", type: "string", smart: true, multiline: true, placeholder: "{{ $json.text }}" },
    {
      name: "inputType", label: "Input Type", type: "options", cols: 3, default: "text",
      options: [
        { value: "text", label: "Text / String" },
        { value: "url", label: "URL (fetch)" },
        { value: "binary", label: "Binary Buffer" },
      ],
      show: { mode: "encode" },
    },
    {
      name: "urlSafe", label: "URL-Safe Base64", type: "boolean", default: false,
      hint: "Replace + with - and / with _ (RFC 4648)",
    },
    {
      name: "padding", label: "Include Padding", type: "boolean", default: true,
      hint: "Append = padding characters",
    },
    { name: "outputField", label: "Output Field", type: "string", smart: false, mono: true, default: "result" },
  ],
  outputs: ["result", "length", "mode"],
};
