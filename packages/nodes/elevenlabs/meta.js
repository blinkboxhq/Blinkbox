export default {
  backendType: "elevenlabs",
  label: "ElevenLabs",
  description: "Generate ultra-realistic speech, list voices, and stream audio via ElevenLabs API.",
  fields: [
    { name: "credentialId", type: "credential", label: "ElevenLabs Credential", accentColor: "#000000" },
    {
      name: "operation", type: "options", label: "Operation", cols: 2, default: "textToSpeech",
      options: [
        { value: "textToSpeech", label: "Text to Speech" },
        { value: "listVoices",   label: "List Voices" },
        { value: "getVoice",     label: "Get Voice" },
        { value: "streamSpeech", label: "Stream Speech" },
      ],
    },

    { name: "text", type: "string", label: "Text", smart: true, multiline: true, show: { operation: ["textToSpeech", "streamSpeech"] } },
    { name: "voiceId", type: "string", label: "Voice ID", smart: true, default: "21m00Tcm4TlvDq8ikWAM", placeholder: "21m00Tcm4TlvDq8ikWAM", show: { operation: ["textToSpeech", "getVoice", "streamSpeech"] } },
    {
      name: "modelId", type: "string", label: "Model ID", smart: true, optional: true, default: "eleven_monolingual_v1",
      show: { operation: ["textToSpeech", "streamSpeech"] },
    },
    { name: "stability", type: "number", label: "Stability (0–1)", default: 0.5, min: 0, max: 1, step: 0.01, show: { operation: "textToSpeech" } },
    { name: "similarityBoost", type: "number", label: "Similarity Boost (0–1)", default: 0.75, min: 0, max: 1, step: 0.01, show: { operation: "textToSpeech" } },
    { name: "style", type: "number", label: "Style (0–1)", default: 0, min: 0, max: 1, step: 0.01, show: { operation: "textToSpeech" } },
    { name: "useSpeakerBoost", type: "boolean", label: "Use Speaker Boost", default: true, show: { operation: "textToSpeech" } },
  ],
  outputs: ["audioUrl", "audioBase64", "voices", "voice", "characterCount"],
};
