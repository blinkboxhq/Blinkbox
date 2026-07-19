import CredentialPicker from "../../../../components/ui/CredentialPicker";

const PROVIDERS = [
  { id: "openai",      label: "OpenAI",      models: ["gpt-5.6","gpt-5.6-mini","gpt-5.5","o3"], color: "#10A37F", credential: "openai" },
  { id: "anthropic",   label: "Anthropic",   models: ["claude-opus-4-8","claude-sonnet-5","claude-haiku-4-5"], color: "#D4C1B3", credential: "anthropic" },
  { id: "gemini",      label: "Gemini",      models: ["gemini-3.5-flash","gemini-3.5-pro","gemini-3.1-pro-preview"], color: "#4285F4", credential: "gemini" },
  { id: "deepseek",    label: "DeepSeek",    models: ["deepseek-v4-pro","deepseek-v4-flash","deepseek-reasoner"], color: "#4D9BF8", credential: "deepseek" },
  { id: "openrouter",  label: "OpenRouter",  models: ["deepseek/deepseek-v4-pro","anthropic/claude-sonnet-5","openai/gpt-5.6"], color: "#6366f1", credential: "openrouter" },
];

export default function AgentLLMNode({ config = {}, updateConfig }) {
  const provider = PROVIDERS.find(p => p.id === (config.provider || "openai")) || PROVIDERS[0];
  const models = provider.models;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: provider.color + "18", border: `1px solid ${provider.color}30` }}>
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill={provider.color}>
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM8 13a5.5 5.5 0 0 1-4.4-2.2C3.6 9.6 5.6 8.5 8 8.5s4.4 1.1 4.4 2.3A5.5 5.5 0 0 1 8 13z" />
          </svg>
        </div>
        <div>
          <p className="text-[12px] font-bold text-zinc-100">Language Model</p>
          <p className="text-[10px] text-zinc-600">Powers the AI Agent's reasoning</p>
        </div>
      </div>

      {/* Provider picker */}
      <div>
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Provider</label>
        <div className="grid grid-cols-3 gap-1">
          {PROVIDERS.map(p => (
            <button key={p.id} onClick={() => { updateConfig("provider", p.id); updateConfig("model", p.models[0]); }}
              className="py-2 rounded-lg border text-[10px] font-bold transition-all"
              style={config.provider === p.id || (!config.provider && p.id === "openai")
                ? { background: p.color + "15", borderColor: p.color + "40", color: p.color }
                : { background: "transparent", borderColor: "#27272a", color: "#52525b" }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Model picker */}
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

      {/* Credential */}
      <CredentialPicker
        value={config.credentialId || ""}
        onChange={id => updateConfig("credentialId", id)}
        accentColor="blue"
        label={`${provider.label} API Key`}
        placeholder={`Select ${provider.label} credential…`}
      />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-600">
        Connect the <span className="text-zinc-400 font-semibold">output</span> of this node to the <span className="text-violet-400 font-semibold">LLM</span> slot on the AI Agent.
      </div>
    </div>
  );
}
