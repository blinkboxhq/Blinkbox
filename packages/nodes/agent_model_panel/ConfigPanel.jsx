import { useState } from "react";
import CredentialPicker from "@/components/ui/CredentialPicker";

export default function makeAgentModelPanel({ label, credentialType, hasBaseUrl = false, defaultBaseUrl = "http://127.0.0.1:11434", models = [], color = "#6B7280", localOnly = false }) {
  return function AgentModelPanel({ config = {}, updateConfig }) {
    const [streaming, setStreaming] = useState(config.streaming !== false);

    const handleStreaming = (val) => {
      setStreaming(val);
      updateConfig("streaming", val);
    };

    const selectedModel = config.model || (models.length > 0 ? models[0] : "");

    return (
      <div className="flex flex-col gap-4 p-4 bg-[#0d0d0f] min-h-full">

        {/* Provider header */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border"
          style={{ background: color + "18", borderColor: color + "33" }}
        >
          <div className="w-1.5 h-5 rounded-full shrink-0" style={{ background: color }} />
          <div>
            <p className="text-[13px] font-bold text-zinc-100">{label}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">AI chat model provider</p>
          </div>
        </div>

        {localOnly && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-zinc-700/30 bg-zinc-800/20">
            <span className="text-zinc-500 text-[11px] shrink-0 mt-0.5">ℹ</span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Point the Base URL to any OpenAI-compatible server — local or remote (LM Studio, llama.cpp, vLLM, etc.)
            </p>
          </div>
        )}

        {/* Model selector */}
        {models.length > 0 && (
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Model</label>
            <div className="flex flex-col gap-1 max-h-[132px] overflow-y-auto pr-0.5">
              {models.map((m) => {
                const isSelected = selectedModel === m;
                return (
                  <button
                    key={m}
                    onClick={() => updateConfig("model", m)}
                    className="w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-150 border"
                    style={
                      isSelected
                        ? { background: color + "22", borderColor: color + "55", color: color }
                        : { background: "#111", borderColor: "#333", color: "#a1a1aa" }
                    }
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom model input for Ollama */}
        {hasBaseUrl && (
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Custom Model</label>
            <input
              value={config.customModel || ""}
              onChange={(e) => updateConfig("customModel", e.target.value)}
              placeholder="e.g. llama3.2, mistral, codellama"
              className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
          </div>
        )}

        {/* Temperature */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Temperature</label>
            <span className="text-[12px] font-semibold text-zinc-300 tabular-nums">
              {(config.temperature !== undefined ? config.temperature : 0.7).toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={config.temperature !== undefined ? config.temperature : 0.7}
            onChange={(e) => updateConfig("temperature", parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${color} 0%, ${color} ${((config.temperature !== undefined ? config.temperature : 0.7) / 2) * 100}%, #333 ${((config.temperature !== undefined ? config.temperature : 0.7) / 2) * 100}%, #333 100%)`,
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-zinc-600">Precise</span>
            <span className="text-[9px] text-zinc-600">Creative</span>
          </div>
        </div>

        {/* Max tokens */}
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Max Tokens</label>
          <input
            type="number"
            min={100}
            max={32000}
            step={100}
            value={config.maxTokens !== undefined ? config.maxTokens : 2048}
            onChange={(e) => updateConfig("maxTokens", parseInt(e.target.value, 10))}
            className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* System prompt */}
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">System Prompt</label>
          <textarea
            rows={3}
            value={config.systemPrompt || ""}
            onChange={(e) => updateConfig("systemPrompt", e.target.value)}
            placeholder="You are a helpful assistant..."
            className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500 resize-none leading-relaxed"
          />
        </div>

        {/* Streaming toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Streaming</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Stream tokens as they're generated</p>
          </div>
          <button
            onClick={() => handleStreaming(!streaming)}
            className={`relative w-10 h-5 rounded-full transition-all duration-200 shrink-0 ${streaming ? "bg-violet-500" : "bg-zinc-700"}`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${streaming ? "left-[22px]" : "left-0.5"}`}
            />
          </button>
        </div>

        {/* Base URL for local models */}
        {hasBaseUrl && (
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Base URL</label>
            <input
              value={(config.baseUrl || defaultBaseUrl).replace(/\/v1\/chat\/completions$/, "").replace(/\/v1$/, "")}
              onChange={(e) => updateConfig("baseUrl", e.target.value.replace(/\/v1\/chat\/completions$/, "").replace(/\/v1$/, ""))}
              className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
            />
          </div>
        )}

        {/* Credential picker */}
        {credentialType && (
          <CredentialPicker
            value={config.credentialId || ""}
            onChange={(id) => updateConfig("credentialId", id)}
            type={credentialType}
            label={`${label} API Key`}
            placeholder={`Select ${label} credential…`}
          />
        )}

      </div>
    );
  };
}
