export default {
  backendType: "ocr",
  label: "OCR",
  description: "Read text out of an image using a vision model.",
  fields: [
    { name: "imageUrl", type: "string", label: "Image URL", smart: true,
      placeholder: "{{ $json.imageUrl }}" },
    { name: "provider", type: "options", label: "Provider", default: "openai", options: [
      { value: "openai",    label: "OpenAI" },
      { value: "anthropic", label: "Claude" },
    ]},
    { name: "credentialId", type: "credential", label: "API Key", accentColor: "cyan" },
    { name: "prompt", type: "string", label: "Instruction", smart: true, multiline: true,
      hint: "Blank extracts all text as-is. Override to pull specific fields.",
      examples: ["Extract only the invoice total", "Return the text as markdown"] },
    { name: "detail", type: "options", label: "Detail", default: "auto", options: [
      { value: "auto", label: "Auto" },
      { value: "low",  label: "Low" },
      { value: "high", label: "High" },
    ], show: { provider: "openai" } },
    { name: "model", type: "string", label: "Model", smart: false,
      hint: "Blank uses the provider default" },
  ],
  outputs: ["text", "provider", "model", "tokensUsed"],
};
