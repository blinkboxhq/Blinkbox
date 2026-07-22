export default {
  backendType: "translation",
  label: "Translation",
  description: "Translate text between languages with OpenAI, Claude, Google or DeepL.",
  fields: [
    { name: "text", type: "string", label: "Input Text", smart: true, multiline: true,
      placeholder: "{{ $json.text }}" },
    { name: "targetLanguage", type: "string", label: "Translate To", smart: true, default: "en",
      hint: "Language name or ISO code — English, Hindi, es, fr",
      examples: ["English", "Hindi", "Spanish", "French"] },
    { name: "provider", type: "options", label: "Provider", default: "openai", options: [
      { value: "openai",    label: "OpenAI" },
      { value: "anthropic", label: "Claude" },
      { value: "google",    label: "Google" },
      { value: "deepl",     label: "DeepL" },
    ]},
    { name: "credentialId", type: "credential", label: "API Key", accentColor: "blue" },
    { name: "model", type: "string", label: "Model", smart: false,
      hint: "Blank uses the provider default",
      show: { provider: ["openai", "anthropic"] } },
  ],
  outputs: ["translatedText", "detectedSourceLanguage", "targetLanguage", "provider"],
};
