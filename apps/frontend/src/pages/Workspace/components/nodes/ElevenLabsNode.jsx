import { Mic } from 'lucide-react';
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from '../../../../components/ui/CredentialPicker';

const MODELS = [
  { value: 'eleven_monolingual_v1', label: 'Monolingual v1 (English)' },
  { value: 'eleven_multilingual_v2', label: 'Multilingual v2' },
  { value: 'eleven_turbo_v2', label: 'Turbo v2 (fast)' },
];

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
            <SmartVariableInput
              value={config.voiceId || "21m00Tcm4TlvDq8ikWAM"}
              onChange={(v) => updateConfig("voiceId", v)}
              placeholder="21m00Tcm4TlvDq8ikWAM (Rachel)"
              nodeId={nodeId}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Model</label>
            <div className="flex flex-col gap-1">
              {MODELS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => updateConfig("model", m.value)}
                  className={`px-3 py-2 rounded-lg border text-[11px] font-semibold text-left transition-all duration-150 ${
                    (config.model || "eleven_monolingual_v1") === m.value
                      ? "bg-violet-500/10 border-violet-500/30 text-violet-300"
                      : "bg-[#0d0d0d] border-[#222] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
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

      <CredentialPicker
        value={config.credentialId || ""}
        onChange={(id) => updateConfig("credentialId", id)}
        accentColor="violet"
        label="ElevenLabs API Key"
        placeholder="Select ElevenLabs credential..."
      />
    </div>
  );
}
