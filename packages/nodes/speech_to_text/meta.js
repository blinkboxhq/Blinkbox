export default {
  backendType: "speech_to_text",
  label: "Speech to Text",
  description: "Transcribe audio from a URL using OpenAI Whisper, Google, or AssemblyAI",
  fields: [
    { name: "audioUrl", label: "Audio URL", type: "string", smart: true, placeholder: "https://example.com/audio.mp3" },
    { name: "provider", label: "Provider", type: "options", cols: 3, default: "openai", options: [
      { value: "openai",      label: "OpenAI Whisper" },
      { value: "google",      label: "Google STT" },
      { value: "assemblyai",  label: "AssemblyAI" },
    ]},
    { name: "model", label: "Model", type: "options", cols: 2, default: "whisper-1", options: [
      { value: "whisper-1",      label: "whisper-1" },
      { value: "whisper-large",  label: "whisper-large" },
    ], show: { provider: "openai" } },
    { name: "language", label: "Language Code (optional)", type: "string", smart: false, placeholder: "en" },
    { name: "timestamps", label: "Include timestamps", type: "boolean", default: false },
    { name: "speakerDiarization", label: "Speaker diarization", type: "boolean", default: false },
    { name: "punctuation", label: "Auto punctuation", type: "boolean", default: true },
    { name: "credentialId", label: "API Credential", type: "credential", placeholder: "STT API key", accentColor: "#10a37f" },
  ],
  outputs: ["transcript", "words", "duration", "language"],
};
