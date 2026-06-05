export default {
  backendType: "gemini",
  label: "Gemini",
  description: "Generate text, analyze images and documents using Google Gemini models.",
  fields: [
    { name: "credentialId", type: "credential", label: "Gemini Credential", accentColor: "#4285F4" },
    {
      name: "operation", type: "options", label: "Operation", cols: 2, default: "message",
      options: [
        { value: "message",         label: "Chat Message" },
        { value: "analyzeImage",    label: "Analyze Image" },
        { value: "analyzeDocument", label: "Analyze Document" },
        { value: "generatePrompt",  label: "Generate Prompt" },
      ],
    },

    {
      name: "model", type: "options", label: "Model", cols: 1, default: "gemini-2.0-flash",
      options: [
        { value: "gemini-2.0-flash",  label: "Gemini 2.0 Flash" },
        { value: "gemini-1.5-pro",    label: "Gemini 1.5 Pro" },
        { value: "gemini-1.5-flash",  label: "Gemini 1.5 Flash" },
      ],
    },

    { name: "messages", type: "string", label: "Messages", smart: true, multiline: true, hint: "JSON array or plain string", show: { operation: "message" } },
    { name: "systemPrompt", type: "string", label: "System Prompt", smart: true, multiline: true, optional: true, show: { operation: "message" } },
    { name: "temperature", type: "number", label: "Temperature", default: 0.9, min: 0, max: 2, step: 0.1, show: { operation: "message" } },
    { name: "maxOutputTokens", type: "number", label: "Max Output Tokens", default: 2048, show: { operation: "message" } },

    { name: "imageUrl", type: "string", label: "Image URL", smart: true, show: { operation: "analyzeImage" } },
    { name: "prompt", type: "string", label: "Prompt", smart: true, multiline: true, default: "Describe this image", show: { operation: "analyzeImage" } },

    { name: "fileUrl", type: "string", label: "File URL", smart: true, show: { operation: "analyzeDocument" } },
    { name: "prompt", type: "string", label: "Prompt", smart: true, multiline: true, show: { operation: "analyzeDocument" } },

    { name: "description", type: "string", label: "Description", smart: true, multiline: true, show: { operation: "generatePrompt" } },
  ],
  outputs: ["message", "content", "analysis"],
};
