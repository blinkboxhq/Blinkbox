export default {
  backendType: "anthropic",
  label: "Anthropic",
  description: "Generate text, analyze images and documents using Claude models.",
  fields: [
    { name: "credentialId", type: "credential", label: "Anthropic Credential", accentColor: "#CC785C" },
    {
      name: "operation", type: "options", label: "Operation", cols: 2, default: "message",
      options: [
        { value: "message",        label: "Chat Message" },
        { value: "analyzeImage",   label: "Analyze Image" },
        { value: "analyzeDocument",label: "Analyze Document" },
        { value: "improvePrompt",  label: "Improve Prompt" },
        { value: "generatePrompt", label: "Generate Prompt" },
      ],
    },

    {
      name: "model", type: "options", label: "Model", cols: 1, default: "claude-sonnet-4-6",
      options: [
        { value: "claude-opus-4-8",              label: "Claude Opus 4.8" },
        { value: "claude-sonnet-4-6",            label: "Claude Sonnet 4.6" },
        { value: "claude-haiku-4-5-20251001",    label: "Claude Haiku 4.5" },
      ],
    },

    { name: "messages", type: "string", label: "Messages", smart: true, multiline: true, hint: "JSON array or plain string", show: { operation: "message" } },
    { name: "systemPrompt", type: "string", label: "System Prompt", smart: true, multiline: true, optional: true, show: { operation: "message" } },
    { name: "temperature", type: "number", label: "Temperature", default: 0.7, min: 0, max: 1, step: 0.1, show: { operation: "message" } },
    { name: "maxTokens", type: "number", label: "Max Tokens", default: 1024, show: { operation: "message" } },

    { name: "imageUrl", type: "string", label: "Image URL", smart: true, show: { operation: "analyzeImage" } },
    { name: "prompt", type: "string", label: "Prompt", smart: true, multiline: true, default: "Describe this image", show: { operation: "analyzeImage" } },

    { name: "fileUrl", type: "string", label: "File URL", smart: true, show: { operation: "analyzeDocument" } },
    { name: "prompt", type: "string", label: "Prompt", smart: true, multiline: true, default: "Summarize this document", show: { operation: "analyzeDocument" } },

    { name: "prompt", type: "string", label: "Prompt", smart: true, multiline: true, show: { operation: "improvePrompt" } },
    { name: "context", type: "string", label: "Context", smart: true, multiline: true, optional: true, show: { operation: "improvePrompt" } },

    { name: "description", type: "string", label: "Description", smart: true, multiline: true, placeholder: "Describe what you want the AI to do", show: { operation: "generatePrompt" } },
  ],
  outputs: ["message", "content", "analysis"],
};
