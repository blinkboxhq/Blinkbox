import { useState } from "react";

const DEFAULT_MODELS = ["local-model", "llama-3.2-3b-instruct", "mistral-7b-instruct", "phi-3-mini-4k-instruct", "gemma-3-12b"];

function isLocalhost(url) {
  if (!url) return false;
  try {
    const u = new URL(url.startsWith("http") ? url : "http://" + url);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "0.0.0.0" || u.hostname === "::1";
  } catch {
    return false;
  }
}

export default function LmStudioConfigPanel({ config = {}, updateConfig }) {
  const [streaming, setStreaming] = useState(config.streaming !== false);
  const [copied, setCopied] = useState(false);

  const baseUrl = (config.baseUrl || "").replace(/\/v1\/chat\/completions$/, "").replace(/\/v1$/, "");
  const showLocalhostWarning = isLocalhost(baseUrl) || (!baseUrl);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleStreaming = (val) => {
    setStreaming(val);
    updateConfig("streaming", val);
  };

  const selectedModel = config.customModel?.trim() || config.model || DEFAULT_MODELS[0];

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#0d0d0f] min-h-full">

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border"
        style={{ background: "#C850C018", borderColor: "#C850C033" }}>
        <div className="w-1.5 h-5 rounded-full shrink-0" style={{ background: "#C850C0" }} />
        <div>
          <p className="text-[13px] font-bold text-zinc-100">OpenAI Compatible</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">LM Studio · llama.cpp · vLLM · KoboldCpp · any remote endpoint</p>
        </div>
      </div>

      {/* Cloud connectivity warning */}
      {showLocalhostWarning && (
        <div className="flex flex-col gap-2 px-3 py-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06]">
          <div className="flex items-start gap-2">
            <span className="text-amber-400 text-[12px] shrink-0 mt-0.5">⚠</span>
            <div>
              <p className="text-[11px] font-semibold text-amber-300 leading-snug">
                Cloud backend can't reach localhost
              </p>
              <p className="text-[10px] text-amber-400/70 mt-1 leading-relaxed">
                Blinkbox runs on a remote server. <span className="font-mono">127.0.0.1:1234</span> points to that server, not your machine. You need to expose LM Studio publicly.
              </p>
            </div>
          </div>

          <div className="mt-1 flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Quick fix — run in your terminal:</p>
            <button
              onClick={() => handleCopy("ngrok http 1234")}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-zinc-700/50 bg-zinc-900/60 hover:bg-zinc-800/60 transition-colors group"
            >
              <code className="text-[11px] text-emerald-400 font-mono">ngrok http 1234</code>
              <span className="text-[9px] text-zinc-600 group-hover:text-zinc-400 transition-colors ml-2 shrink-0">
                {copied ? "Copied!" : "Copy"}
              </span>
            </button>
            <p className="text-[9px] text-zinc-600 leading-relaxed">
              Then paste the ngrok URL (e.g. <span className="font-mono text-zinc-500">https://abc123.ngrok.io</span>) as Base URL below.{" "}
              <a
                href="https://ngrok.com/download"
                target="_blank"
                rel="noreferrer"
                className="text-violet-400 underline underline-offset-2 hover:text-violet-300"
              >
                Get ngrok →
              </a>
            </p>
          </div>

          <div className="mt-0.5 flex items-start gap-2 px-2 py-1.5 rounded border border-zinc-800/50 bg-zinc-900/30">
            <span className="text-[9px] text-zinc-600 shrink-0 mt-0.5">💡</span>
            <p className="text-[9px] text-zinc-600 leading-relaxed">
              Running Blinkbox locally? <span className="text-zinc-400">localhost:1234</span> works fine — no ngrok needed.
            </p>
          </div>
        </div>
      )}

      {/* Base URL — always first for this node */}
      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Base URL</label>
        <input
          value={baseUrl}
          onChange={(e) => updateConfig("baseUrl", e.target.value.replace(/\/v1\/chat\/completions$/, "").replace(/\/v1$/, ""))}
          placeholder="http://127.0.0.1:1234 or https://your-ngrok.ngrok.io"
          className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
        />
        <p className="text-[9px] text-zinc-600 mt-1">The <code className="text-zinc-500">/v1/chat/completions</code> suffix is added automatically.</p>
      </div>

      {/* Model */}
      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Model</label>
        <input
          value={config.customModel || config.model || ""}
          onChange={(e) => { updateConfig("customModel", e.target.value); updateConfig("model", e.target.value); }}
          placeholder="e.g. local-model, llama-3.2, mistral-7b"
          className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500"
        />
        <div className="flex flex-wrap gap-1 mt-1.5">
          {DEFAULT_MODELS.map((m) => (
            <button
              key={m}
              onClick={() => { updateConfig("customModel", m); updateConfig("model", m); }}
              className="text-[9px] px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-600 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Temperature */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Temperature</label>
          <span className="text-[12px] font-semibold text-zinc-300 tabular-nums">
            {(config.temperature !== undefined ? config.temperature : 0.7).toFixed(1)}
          </span>
        </div>
        <input
          type="range" min={0} max={2} step={0.1}
          value={config.temperature !== undefined ? config.temperature : 0.7}
          onChange={(e) => updateConfig("temperature", parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #C850C0 0%, #C850C0 ${((config.temperature !== undefined ? config.temperature : 0.7) / 2) * 100}%, #333 ${((config.temperature !== undefined ? config.temperature : 0.7) / 2) * 100}%, #333 100%)`,
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
          type="number" min={100} max={32000} step={100}
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

    </div>
  );
}
