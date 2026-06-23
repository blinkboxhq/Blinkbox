import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

const DEFAULT_MODELS = ["llama3.2", "mistral", "codellama", "phi3", "gemma3", "qwen2.5", "deepseek-r1"];

export default function OllamaConfigPanel({ config = {}, updateConfig }) {
  const [serverStatus, setServerStatus] = useState(null); // null = loading
  const [pullModel, setPullModel] = useState("");
  const [pulling, setPulling] = useState(false);
  const [pullLog, setPullLog] = useState("");
  const [modelListOpen, setModelListOpen] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await api.get("/api/ollama/status");
      setServerStatus(r.data);
    } catch {
      setServerStatus({ installed: false, running: false, models: [] });
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handlePull = async () => {
    if (!pullModel.trim() || pulling) return;
    setPulling(true);
    setPullLog("Starting pull...");

    try {
      const token = localStorage.getItem("blinkbox_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/ollama/pull`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ model: pullModel.trim() }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let lastStatus = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const obj = JSON.parse(line);
            if (obj.status) {
              lastStatus = obj.status;
              if (obj.completed && obj.total) {
                const pct = Math.round((obj.completed / obj.total) * 100);
                setPullLog(`${obj.status} — ${pct}%`);
              } else {
                setPullLog(obj.status);
              }
            }
            if (obj.error) setPullLog(`Error: ${obj.error}`);
          } catch {}
        }
      }

      if (lastStatus === "success" || lastStatus.includes("success")) {
        setPullLog("Done! Model pulled successfully.");
        updateConfig("customModel", pullModel.trim());
        setPullModel("");
        fetchStatus();
      }
    } catch (err) {
      setPullLog(`Failed: ${err.message}`);
    } finally {
      setPulling(false);
    }
  };

  const serverRunning = serverStatus?.running;
  const serverInstalled = serverStatus?.installed;
  const serverModels = serverStatus?.models || [];
  const allModels = serverRunning && serverModels.length > 0 ? serverModels : DEFAULT_MODELS;

  const selectedModel = config.customModel?.trim() || config.model || allModels[0] || "";

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#0d0d0f] min-h-full">

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border"
        style={{ background: "#7C3AED18", borderColor: "#7C3AED33" }}>
        <div className="w-1.5 h-5 rounded-full shrink-0" style={{ background: "#7C3AED" }} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-zinc-100">Ollama</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Local open-source model provider</p>
        </div>
        {/* Server status badge */}
        {serverStatus !== null && (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${
            serverRunning
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : serverInstalled
              ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
              : "bg-zinc-800 border border-zinc-700 text-zinc-500"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${serverRunning ? "bg-emerald-500" : serverInstalled ? "bg-amber-500" : "bg-zinc-600"}`} />
            {serverRunning ? "Server Online" : serverInstalled ? "Not Running" : "Not Installed"}
          </div>
        )}
      </div>

      {/* Server Ollama section */}
      {serverRunning ? (
        <div className="flex flex-col gap-3">
          {/* Model picker from server */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">
              Model
              <span className="ml-2 text-[9px] font-normal text-emerald-500 normal-case tracking-normal">
                {serverModels.length} installed on server
              </span>
            </label>

            {serverModels.length > 0 ? (
              <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto">
                {serverModels.map((m) => {
                  const isSelected = selectedModel === m;
                  return (
                    <button
                      key={m}
                      onClick={() => { updateConfig("customModel", m); updateConfig("model", m); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all border"
                      style={isSelected
                        ? { background: "#7C3AED22", borderColor: "#7C3AED55", color: "#a78bfa" }
                        : { background: "#111", borderColor: "#333", color: "#a1a1aa" }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-3 py-2.5 rounded-lg border border-dashed border-zinc-800 text-[11px] text-zinc-600">
                No models installed yet. Pull one below.
              </div>
            )}
          </div>

          {/* Pull a model */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">
              Pull a Model
            </label>
            <div className="flex gap-2">
              <input
                value={pullModel}
                onChange={(e) => setPullModel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePull()}
                placeholder="e.g. llama3.2, mistral, phi3"
                className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-[12px] text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
              <button
                onClick={handlePull}
                disabled={!pullModel.trim() || pulling}
                className="px-3 py-2 rounded-lg text-[11px] font-semibold text-violet-300 border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-40 transition-all shrink-0"
              >
                {pulling ? "Pulling…" : "Pull"}
              </button>
            </div>
            {pullLog && (
              <p className={`text-[10px] mt-1.5 font-mono ${pullLog.startsWith("Error") || pullLog.startsWith("Failed") ? "text-red-400" : pullLog.includes("Done") ? "text-emerald-400" : "text-zinc-500"}`}>
                {pullLog}
              </p>
            )}
            {/* Quick-pick popular models */}
            <div className="flex flex-wrap gap-1 mt-2">
              {["llama3.2", "mistral", "phi3", "qwen2.5:3b", "gemma3:4b"].map((m) => (
                <button
                  key={m}
                  onClick={() => setPullModel(m)}
                  className="text-[9px] px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-600 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* No server Ollama — custom URL mode */
        <div>
          {serverInstalled && !serverRunning && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.07] mb-3">
              <span className="text-amber-400 text-[11px] shrink-0 mt-0.5">⚠</span>
              <p className="text-[11px] text-amber-300 leading-relaxed">
                Ollama is installed on the server but not running. It will start automatically on next server boot.
              </p>
            </div>
          )}

          {!serverInstalled && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-zinc-700/30 bg-zinc-800/20 mb-3">
              <span className="text-zinc-500 text-[11px] shrink-0 mt-0.5">ℹ</span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Server-side Ollama not found. Connect to Ollama running on your local machine or any remote host.
              </p>
            </div>
          )}

          {/* Custom model name */}
          <div className="mb-3">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Model Name</label>
            <input
              value={config.customModel || config.model || ""}
              onChange={(e) => updateConfig("customModel", e.target.value)}
              placeholder="e.g. llama3.2, mistral, codellama"
              className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {DEFAULT_MODELS.slice(0, 5).map((m) => (
                <button key={m} onClick={() => updateConfig("customModel", m)}
                  className="text-[9px] px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-600 hover:text-zinc-300 hover:border-zinc-700 transition-colors">
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Base URL — always show */}
      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">
          Base URL
          {serverRunning && <span className="ml-2 text-[9px] font-normal text-zinc-600 normal-case">Leave blank to use server Ollama</span>}
        </label>
        <input
          value={(config.baseUrl || "").replace(/\/v1\/chat\/completions$/, "").replace(/\/v1$/, "")}
          onChange={(e) => updateConfig("baseUrl", e.target.value.replace(/\/v1\/chat\/completions$/, "").replace(/\/v1$/, ""))}
          placeholder={serverRunning ? "http://127.0.0.1:11434 (auto)" : "http://127.0.0.1:11434"}
          className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
        />
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
            background: `linear-gradient(to right, #7C3AED 0%, #7C3AED ${((config.temperature !== undefined ? config.temperature : 0.7) / 2) * 100}%, #333 ${((config.temperature !== undefined ? config.temperature : 0.7) / 2) * 100}%, #333 100%)`,
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

    </div>
  );
}
