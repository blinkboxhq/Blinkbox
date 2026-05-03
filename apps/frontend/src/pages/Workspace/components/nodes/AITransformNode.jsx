import { Wand2 } from "lucide-react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "summarize",  label: "Summarize" },
  { value: "translate",  label: "Translate" },
  { value: "tone",       label: "Change Tone" },
  { value: "grammar",    label: "Fix Grammar" },
  { value: "expand",     label: "Expand" },
  { value: "shorten",    label: "Shorten" },
  { value: "custom",     label: "Custom" },
];

const TONES = ["professional", "friendly", "formal", "casual", "persuasive", "empathetic", "concise"];

const MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "claude-haiku-4-5-20251001", "claude-sonnet-4-6"];

export default function AITransformNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "summarize";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-fuchsia-500/5 border border-fuchsia-500/20 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center shrink-0">
          <Wand2 className="w-4 h-4 text-fuchsia-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-fuchsia-400">AI Transform</span>
          <span className="text-[10px] text-zinc-500">Rewrite text with preset AI operations</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Text Input</label>
        <SmartVariableInput
          value={config.text || ""}
          onChange={(v) => updateConfig("text", v)}
          placeholder="{{n1.body.content}}"
          multiline
          nodeId={nodeId}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-1.5">
          {OPERATIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => updateConfig("operation", o.value)}
              className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                op === o.value
                  ? "bg-fuchsia-500/10 border-fuchsia-500/40 text-fuchsia-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {op === "translate" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Language</label>
          <input
            value={config.language || ""}
            onChange={(e) => updateConfig("language", e.target.value)}
            placeholder="Spanish"
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-fuchsia-500/40"
          />
        </div>
      )}

      {op === "tone" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Tone</label>
          <div className="flex flex-wrap gap-1.5">
            {TONES.map((t) => (
              <button
                key={t}
                onClick={() => updateConfig("tone", t)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${
                  config.tone === t
                    ? "bg-fuchsia-500/10 border-fuchsia-500/40 text-fuchsia-400"
                    : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {["summarize", "expand", "shorten"].includes(op) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Length</label>
          <div className="grid grid-cols-3 gap-1.5">
            {["short", "medium", "long"].map((l) => (
              <button
                key={l}
                onClick={() => updateConfig("length", l)}
                className={`py-2 rounded-lg border text-xs font-bold capitalize transition-all ${
                  (config.length || "medium") === l
                    ? "bg-fuchsia-500/10 border-fuchsia-500/40 text-fuchsia-400"
                    : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {op === "custom" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Custom Instruction</label>
          <SmartVariableInput
            value={config.customPrompt || ""}
            onChange={(v) => updateConfig("customPrompt", v)}
            placeholder="Extract all action items and format them as a numbered list."
            multiline
            nodeId={nodeId}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Model</label>
        <div className="flex flex-wrap gap-1.5">
          {MODELS.map((m) => (
            <button key={m} onClick={() => updateConfig("model", m)}
              className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all ${
                (config.model || "gpt-4o-mini") === m
                  ? "bg-fuchsia-500/10 border-fuchsia-500/40 text-fuchsia-300"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-500 hover:border-[#333]"
              }`}>{m}</button>
          ))}
        </div>
      </div>

      <CredentialPicker
        value={config.credentialId || ""}
        onChange={(id) => updateConfig("credentialId", id)}
        accentColor="fuchsia"
        label="OpenAI API Key"
        placeholder="Select OpenAI credential..."
      />
    </div>
  );
}
