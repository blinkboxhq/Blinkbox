import CredentialPicker from "../../../../components/ui/CredentialPicker";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

export default function makeAgentModelPanel({ label, color, credentialType, models, defaultModel, hasBaseUrl = false }) {
  return function AgentModelPanel({ config = {}, updateConfig, nodeId, nodes, edges }) {
    return (
      <div className="flex flex-col gap-4 p-4">

        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: color + "18", border: `1px solid ${color}30` }}>
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill={color}>
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM8 13a5.5 5.5 0 0 1-4.4-2.2C3.6 9.6 5.6 8.5 8 8.5s4.4 1.1 4.4 2.3A5.5 5.5 0 0 1 8 13z"/>
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-bold text-zinc-100">{label}</p>
            <p className="text-[10px] text-zinc-500">Agent chat model</p>
          </div>
        </div>

        {/* Model */}
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Model</label>
          {models ? (
            <div className="flex flex-col gap-1">
              {models.map(m => (
                <button key={m.value} onClick={() => updateConfig("model", m.value)}
                  className={`px-3 py-2 rounded-lg border text-left text-[11px] font-mono transition-all ${
                    (config.model || defaultModel) === m.value
                      ? "text-zinc-100 bg-zinc-800 border-zinc-600"
                      : "text-zinc-500 bg-zinc-950 border-zinc-800/60 hover:border-zinc-700"
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
          ) : (
            <input
              value={config.model || defaultModel || ""}
              onChange={e => updateConfig("model", e.target.value)}
              placeholder="e.g. llama3.2"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
            />
          )}
        </div>

        {/* Base URL for local models */}
        {hasBaseUrl && (
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Base URL</label>
            <input
              value={config.baseUrl || "http://localhost:11434"}
              onChange={e => updateConfig("baseUrl", e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
            />
          </div>
        )}

        {/* Credential */}
        {credentialType && (
          <CredentialPicker
            value={config.credentialId || ""}
            onChange={id => updateConfig("credentialId", id)}
            type={credentialType}
            label={`${label} API Key`}
            placeholder={`Select ${label} credential…`}
          />
        )}

        {/* System Prompt */}
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">System Prompt</label>
          <SmartVariableInput
            value={config.systemPrompt || ""}
            onChange={v => updateConfig("systemPrompt", v)}
            placeholder="Optional system prompt for this agent…"
            multiline
            rows={3}
            nodeId={nodeId}
            nodes={nodes}
            edges={edges}
          />
        </div>

        {/* Temperature */}
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">
            Temperature — <span className="text-zinc-300 font-mono">{(config.temperature ?? 0.7).toFixed(2)}</span>
          </label>
          <input
            type="range" min="0" max="1" step="0.05"
            value={config.temperature ?? 0.7}
            onChange={e => updateConfig("temperature", parseFloat(e.target.value))}
            className="w-full accent-violet-500"
          />
          <div className="flex justify-between text-[9px] text-zinc-600 mt-1">
            <span>Precise</span>
            <span>Creative</span>
          </div>
        </div>

      </div>
    );
  };
}
