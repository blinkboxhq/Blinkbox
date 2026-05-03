import { Tag } from "lucide-react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const MODELS = ["gpt-4o-mini", "gpt-4o", "claude-haiku-4-5-20251001"];

export default function AIClassifyNode({ config = {}, updateConfig, nodeId }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Tag className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-violet-400">AI Classify</span>
          <span className="text-[10px] text-zinc-500">Classify text into categories — no prompt needed</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Text to Classify</label>
        <SmartVariableInput
          value={config.text || ""}
          onChange={(v) => updateConfig("text", v)}
          placeholder="{{n1.body.message}}"
          multiline
          nodeId={nodeId}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Categories</label>
        <input
          value={config.categories || ""}
          onChange={(e) => updateConfig("categories", e.target.value)}
          placeholder="spam, not spam"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/40"
        />
        <p className="text-[10px] text-zinc-600">Comma-separated list of category labels</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Context (optional)</label>
        <SmartVariableInput
          value={config.context || ""}
          onChange={(v) => updateConfig("context", v)}
          placeholder="These are customer support tickets..."
          multiline
          nodeId={nodeId}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Model</label>
        <div className="flex gap-1.5">
          {MODELS.map((m) => (
            <button key={m} onClick={() => updateConfig("model", m)}
              className={`flex-1 py-1.5 rounded-lg border text-[10px] font-mono font-bold transition-all ${
                (config.model || "gpt-4o-mini") === m
                  ? "bg-violet-500/10 border-violet-500/40 text-violet-300"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-500 hover:border-[#333]"
              }`}>{m}</button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => updateConfig("allowMultiple", !config.allowMultiple)}
          className={`relative w-8 h-4 rounded-full transition-all shrink-0 ${config.allowMultiple ? "bg-violet-500" : "bg-zinc-700"}`}
        >
          <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${config.allowMultiple ? "left-4" : "left-0.5"}`} />
        </button>
        <span className="text-xs text-zinc-400">Allow multiple categories</span>
      </div>

      <CredentialPicker
        value={config.credentialId || ""}
        onChange={(id) => updateConfig("credentialId", id)}
        accentColor="violet"
        label="OpenAI API Key"
        placeholder="Select OpenAI credential..."
      />
    </div>
  );
}
