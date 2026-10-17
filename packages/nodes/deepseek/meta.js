export default {
  backendType: "deepseek",
  label: "DeepSeek",
  description: "Powerful reasoning & chat models",
  fields: [
    { name: "model", label: "Model", type: "options", cols: 1, default: "deepseek-flash", options: [
      { value: "deepseek-flash",    label: "DeepSeek Flash (V4.1)" },
      { value: "deepseek-v4-pro",   label: "DeepSeek V4 Pro" },
    ]},
    { name: "outputFormat", label: "Output Format", type: "options", cols: 2, default: "text", options: [
      { value: "text", label: "Raw Text" },
      { value: "json", label: "Structured JSON" },
    ]},
    { name: "prompt", label: "Prompt", type: "string", smart: true, multiline: true, placeholder: "e.g. Reason through this step by step..." },
    { name: "credentialId", label: "DeepSeek API Key", type: "credential", accentColor: "blue", placeholder: "Select DeepSeek credential…" },
  ],
  outputs: ["text", "model", "usage"],
};
