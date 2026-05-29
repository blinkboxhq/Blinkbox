export default {
  backendType: "elevenlabs",
  label: "ElevenLabs",
  description: "Text to speech with ultra-realistic voices",
  fields: [
    { name: "credentialId", label: "ElevenLabs API Key", type: "credential", accentColor: "violet", placeholder: "Select ElevenLabs credential…" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "textToSpeech", options: [
      { value: "textToSpeech", label: "Text to Speech" },
      { value: "listVoices",   label: "List Voices" },
    ]},
    { name: "text", label: "Text", type: "string", smart: true, placeholder: "{{upstream.message}}", show: { operation: "textToSpeech" } },
    { name: "voiceId", label: "Voice ID", type: "string", smart: false, mono: true, default: "21m00Tcm4TlvDq8ikWAM", placeholder: "21m00Tcm4TlvDq8ikWAM (Rachel)", show: { operation: "textToSpeech" } },
    { name: "model", label: "Model", type: "options", cols: 1, default: "eleven_monolingual_v1", options: [
      { value: "eleven_monolingual_v1", label: "Monolingual v1 (English)" },
      { value: "eleven_multilingual_v2", label: "Multilingual v2" },
      { value: "eleven_turbo_v2", label: "Turbo v2 (fast)" },
    ], show: { operation: "textToSpeech" } },
    { type: "row", show: { operation: "textToSpeech" }, fields: [
      { name: "stability", label: "Stability (0–1)", type: "number", default: 0.5, min: 0, max: 1, step: 0.05 },
      { name: "similarityBoost", label: "Similarity (0–1)", type: "number", default: 0.75, min: 0, max: 1, step: 0.05 },
    ]},
  ],
  outputs: ["audioBase64", "fileName", "voiceId"],
};
