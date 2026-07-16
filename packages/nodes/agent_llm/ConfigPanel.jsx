import CredentialPicker from "@/components/ui/CredentialPicker";

const PROVIDERS = [
  { id: "openai",      label: "OpenAI",       models: ["gpt-4o","gpt-4o-mini","gpt-4-turbo","gpt-3.5-turbo"],                                                         color: "#10A37F", credentialType: "OpenAI" },
  { id: "anthropic",   label: "Anthropic",    models: ["claude-opus-4-8","claude-sonnet-5","claude-haiku-4-5"],                                                         color: "#D4C1B3", credentialType: "Anthropic" },
  { id: "gemini",      label: "Gemini",       models: ["gemini-2.0-flash","gemini-1.5-pro","gemini-1.5-flash"],                                                        color: "#4285F4", credentialType: "Gemini" },
  { id: "deepseek",    label: "DeepSeek",     models: ["deepseek-chat","deepseek-reasoner"],                                                                            color: "#4D9BF8", credentialType: "DeepSeek" },
  { id: "groq",        label: "Groq",         models: ["llama-3.3-70b-versatile","llama-3.1-8b-instant","mixtral-8x7b-32768"],                                         color: "#F55036", credentialType: "Groq" },
  { id: "xai",         label: "xAI",          models: ["grok-3","grok-3-mini","grok-beta"],                                                                             color: "#FFFFFF", credentialType: "xAI" },
  { id: "openrouter",  label: "OpenRouter",   models: ["meta-llama/llama-3.3-70b-instruct","anthropic/claude-3.5-sonnet","google/gemini-2.0-flash-001"],                color: "#6366f1", credentialType: "OpenRouter" },
  { id: "nvidia_nim",  label: "NVIDIA NIM",   models: ["nvidia/nemotron-3-ultra-550b-a55b","meta/llama-4-maverick-17b-128e-instruct","meta/llama-3.3-70b-instruct","deepseek-ai/deepseek-v4-flash"], color: "#76B900", credentialType: "NvidiaNim" },
  { id: "gemma",       label: "Gemma",        models: ["google/gemma-4-31b-it","google/gemma-3-27b-it","google/gemma-3n-e4b-it","google/gemma-3-1b-it"],               color: "#4285F4", credentialType: "NvidiaNim" },
  { id: "together",    label: "Together",     models: ["meta-llama/Llama-3-70b-chat-hf","mistralai/Mixtral-8x7B-Instruct-v0.1"],                                      color: "#FF6B6B", credentialType: "Together" },
  { id: "perplexity",  label: "Perplexity",   models: ["llama-3-sonar-large-32k-online","llama-3-sonar-small-32k-online"],                                             color: "#20808D", credentialType: "Perplexity" },
  { id: "moonshot",    label: "Moonshot",     models: ["moonshot-v1-8k","moonshot-v1-32k","moonshot-v1-128k"],                                                         color: "#1B64F4", credentialType: "Moonshot" },
];

export default function AgentLLMNode({ config = {}, updateConfig }) {
  const provider = PROVIDERS.find(p => p.id === (config.provider || "openai")) || PROVIDERS[0];
  const models = provider.models;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: provider.color + "18", border: `1px solid ${provider.color}30` }}>
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill={provider.color}>
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM8 13a5.5 5.5 0 0 1-4.4-2.2C3.6 9.6 5.6 8.5 8 8.5s4.4 1.1 4.4 2.3A5.5 5.5 0 0 1 8 13z" />
          </svg>
        </div>
        <div>
          <p className="text-[12px] font-bold text-zinc-100">Language Model</p>
          <p className="text-[10px] text-zinc-600">Powers the AI Agent's reasoning</p>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Provider</label>
        <div className="grid grid-cols-3 gap-1">
          {PROVIDERS.map(p => (
            <button key={p.id}
              onClick={() => { updateConfig("provider", p.id); updateConfig("model", p.models[0]); updateConfig("credentialId", ""); }}
              className="py-2 rounded-lg border text-[10px] font-bold transition-all"
              style={(config.provider || "openai") === p.id
                ? { background: p.color + "15", borderColor: p.color + "40", color: p.color }
                : { background: "transparent", borderColor: "#27272a", color: "#52525b" }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Model</label>
        <div className="flex flex-col gap-1">
          {models.map(m => (
            <button key={m} onClick={() => updateConfig("model", m)}
              className={`px-3 py-2 rounded-lg border text-left text-[11px] font-mono transition-all ${
                (config.model || models[0]) === m
                  ? "text-zinc-100 bg-zinc-800 border-zinc-600"
                  : "text-zinc-600 bg-zinc-950 border-zinc-800/60 hover:border-zinc-700"
              }`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <CredentialPicker
        value={config.credentialId || ""}
        onChange={id => updateConfig("credentialId", id)}
        accentColor="violet"
        credentialType={provider.credentialType}
        label={`${provider.label} API Key`}
        placeholder={`Select ${provider.label} credential…`}
      />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-600">
        Connect the <span className="text-zinc-400 font-semibold">output</span> of this node to the <span className="text-violet-400 font-semibold">LLM</span> slot on the AI Agent.
      </div>
    </div>
  );
}
