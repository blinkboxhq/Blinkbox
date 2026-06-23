export default {
  backendType: "openai",
  label: "OpenAI",
  description: "Generate text, images, transcriptions, and content analysis using OpenAI models.",
  fields: [
    { name: "credentialId", type: "credential", label: "OpenAI Credential", accentColor: "#10A37F" },
    {
      name: "operation", type: "options", label: "Operation", cols: 2, default: "message",
      options: [
        { value: "message",         label: "Chat Message" },
        { value: "generateImage",   label: "Generate Image" },
        { value: "transcribeAudio", label: "Transcribe Audio" },
        { value: "analyzeDocument", label: "Analyze Document" },
        { value: "analyzeImage",    label: "Analyze Image" },
        { value: "moderateContent", label: "Moderate Content" },
        { value: "generatePrompt",  label: "Generate Prompt" },
        { value: "improvePrompt",   label: "Improve Prompt" },
      ],
    },

    {
      name: "model", type: "options", label: "Model", cols: 2, default: "gpt-4o",
      options: [
        { value: "gpt-4o",       label: "GPT-4o" },
        { value: "gpt-4o-mini",  label: "GPT-4o Mini" },
        { value: "gpt-4-turbo",  label: "GPT-4 Turbo" },
        { value: "gpt-3.5-turbo",label: "GPT-3.5 Turbo" },
      ],
      show: { operation: ["message", "analyzeImage", "analyzeDocument", "generatePrompt", "improvePrompt", "moderateContent"] },
    },

    { name: "messages", type: "string", label: "Messages", smart: true, multiline: true, hint: "JSON array: [{role:user,content:Hello}] or plain string", show: { operation: "message" } },
    { name: "systemPrompt", type: "string", label: "System Prompt", smart: true, multiline: true, optional: true, placeholder: "You are a helpful assistant", show: { operation: "message" } },
    { name: "temperature", type: "number", label: "Temperature", default: 0.7, min: 0, max: 2, step: 0.1, show: { operation: "message" } },
    { name: "maxTokens", type: "number", label: "Max Tokens", default: 1000, show: { operation: "message" } },

    { name: "prompt", type: "string", label: "Prompt", smart: true, multiline: true, show: { operation: "generateImage" } },
    {
      name: "size", type: "options", label: "Size", cols: 3, default: "1024x1024",
      options: [
        { value: "1024x1024",  label: "1024×1024" },
        { value: "1792x1024",  label: "1792×1024" },
        { value: "1024x1792",  label: "1024×1792" },
      ],
      show: { operation: "generateImage" },
    },
    {
      name: "quality", type: "options", label: "Quality", cols: 2, default: "standard",
      options: [
        { value: "standard", label: "Standard" },
        { value: "hd",       label: "HD" },
      ],
      show: { operation: "generateImage" },
    },
    { name: "n", type: "number", label: "Number of Images", default: 1, min: 1, max: 4, show: { operation: "generateImage" } },

    { name: "audioUrl", type: "string", label: "Audio URL or Base64", smart: true, placeholder: "URL or base64 of audio file", show: { operation: "transcribeAudio" } },
    { name: "language", type: "string", label: "Language", smart: true, optional: true, placeholder: "en", show: { operation: "transcribeAudio" } },
    { name: "prompt", type: "string", label: "Prompt", smart: true, optional: true, show: { operation: "transcribeAudio" } },

    { name: "fileUrl", type: "string", label: "File URL", smart: true, placeholder: "URL to PDF or document", show: { operation: "analyzeDocument" } },
    { name: "prompt", type: "string", label: "Prompt", smart: true, multiline: true, default: "Summarize this document", show: { operation: "analyzeDocument" } },

    { name: "imageUrl", type: "string", label: "Image URL or Base64", smart: true, placeholder: "Image URL or base64", show: { operation: "analyzeImage" } },
    { name: "prompt", type: "string", label: "Prompt", smart: true, multiline: true, default: "What is in this image?", show: { operation: "analyzeImage" } },

    { name: "input", type: "string", label: "Content to Moderate", smart: true, multiline: true, show: { operation: "moderateContent" } },

    { name: "prompt", type: "string", label: "Prompt", smart: true, multiline: true, show: { operation: ["generatePrompt", "improvePrompt"] } },
    { name: "context", type: "string", label: "Context", smart: true, multiline: true, optional: true, show: { operation: ["generatePrompt", "improvePrompt"] } },
  ],
  outputs: ["message", "imageUrl", "transcript", "analysis", "flagged", "categories"],
};
