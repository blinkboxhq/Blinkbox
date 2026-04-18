import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

export default function AIExtractNode({ config = {}, updateConfig }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-sky-500/5 border border-sky-500/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-sky-400">AI Extract</span>
          <span className="text-[10px] text-zinc-500">Pull structured data out of unstructured text</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Text Input</label>
        <SmartVariableInput
          value={config.text || ""}
          onChange={(v) => updateConfig("text", v)}
          placeholder="{{n1.body.emailText}}"
          multiline
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Fields to Extract</label>
        <SmartVariableInput
          value={typeof config.fields === "string" ? config.fields : (config.fields ? JSON.stringify(config.fields) : "")}
          onChange={(v) => updateConfig("fields", v)}
          placeholder='name, email, phone  OR  [{"name":"price","type":"number"}]'
          multiline
        />
        <p className="text-[10px] text-zinc-600">Simple: "name, email, phone" — or JSON array for typed fields</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Model</label>
        <input
          value={config.model || "gpt-4o-mini"}
          onChange={(e) => updateConfig("model", e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500/40"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => updateConfig("returnNulls", !config.returnNulls)}
          className={`w-8 h-4 rounded-full transition-all relative ${config.returnNulls !== false ? "bg-sky-500" : "bg-zinc-700"}`}
        >
          <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${config.returnNulls !== false ? "left-4" : "left-0.5"}`} />
        </button>
        <span className="text-xs text-zinc-400">Include null fields in output</span>
      </div>

      <CredentialPicker
        value={config.credentialId || ""}
        onChange={(id) => updateConfig("credentialId", id)}
        accentColor="sky"
        label="OpenAI API Key"
        placeholder="Select OpenAI credential..."
      />
    </div>
  );
}
