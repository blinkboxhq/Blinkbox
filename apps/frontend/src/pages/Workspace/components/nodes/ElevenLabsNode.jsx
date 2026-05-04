import { Mic } from 'lucide-react';
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

export default function ElevenLabsNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || "textToSpeech";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center shrink-0">
            <Mic className="w-4 h-4 text-[#7C3AED]" />
          </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-violet-400">ElevenLabs</span>
          <span className="text-[10px] text-zinc-500">Text to speech with ultra-realistic voices</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Credential (API Key)</label>
        <input
          value={config.credentialId || ""}
          onChange={(e) => updateConfig("credentialId", e.target.value)}
          placeholder="ElevenLabs credential ID"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-violet-500/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-2">
          {[{ id: "textToSpeech", label: "Text to Speech" }, { id: "listVoices", label: "List Voices" }].map((op) => (
            <button
              key={op.id}
              onClick={() => updateConfig("operation", op.id)}
              className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                operation === op.id
                  ? "bg-violet-500/10 border-violet-500/40 text-violet-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {operation === "textToSpeech" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Text</label>
            <SmartVariableInput
              value={config.text || ""}
              onChange={(v) => updateConfig("text", v)}
              placeholder="{{upstream.message}}"
              nodeId={nodeId}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Voice ID</label>
            <input
              value={config.voiceId || "21m00Tcm4TlvDq8ikWAM"}
              onChange={(e) => updateConfig("voiceId", e.target.value)}
              placeholder="21m00Tcm4TlvDq8ikWAM (Rachel)"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-violet-500/40"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Model</label>
            <select
              value={config.model || "eleven_monolingual_v1"}
              onChange={(e) => updateConfig("model", e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/40"
            >
              <option value="eleven_monolingual_v1">Monolingual v1 (English)</option>
              <option value="eleven_multilingual_v2">Multilingual v2</option>
              <option value="eleven_turbo_v2">Turbo v2 (fast)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Stability</label>
              <input type="range" min="0" max="1" step="0.05"
                value={config.stability ?? 0.5}
                onChange={(e) => updateConfig("stability", parseFloat(e.target.value))}
                className="accent-violet-500"
              />
              <span className="text-[9px] text-zinc-600 text-center">{config.stability ?? 0.5}</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Similarity</label>
              <input type="range" min="0" max="1" step="0.05"
                value={config.similarityBoost ?? 0.75}
                onChange={(e) => updateConfig("similarityBoost", parseFloat(e.target.value))}
                className="accent-violet-500"
              />
              <span className="text-[9px] text-zinc-600 text-center">{config.similarityBoost ?? 0.75}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
