import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "listForms",      label: "List Forms" },
  { value: "getForm",        label: "Get Form" },
  { value: "listResponses",  label: "List Responses" },
  { value: "getResponse",    label: "Get Response" },
  { value: "createForm",     label: "Create Form" },
  { value: "deleteResponse", label: "Delete Response" },
];

export default function TypeformNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "listResponses";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="white">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-.5 17.5h-2v-7h2v7zm-1-9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm7.5 9h-2v-3.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V17.5h-2v-7h2v1.08C13.47 10.6 14.2 10 15 10c1.66 0 3 1.34 3 3V17.5z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Typeform</div>
          <div className="text-[11px] text-zinc-500">Forms, responses, workspaces</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-zinc-700/50 border-zinc-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["getForm","listResponses","getResponse","deleteResponse","createForm"].includes(op) && op !== "createForm" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Form ID</label>
          <SmartVariableInput value={config.formId || ""} onChange={(v) => updateConfig("formId", v)} placeholder="abc123XYZ" />
        </div>
      )}

      {op === "listResponses" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Page Size</label>
            <SmartVariableInput value={config.pageSize || "25"} onChange={(v) => updateConfig("pageSize", v)} placeholder="25" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Since (ISO date, optional)</label>
            <SmartVariableInput value={config.since || ""} onChange={(v) => updateConfig("since", v)} placeholder="2024-01-01T00:00:00Z" />
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <p className="text-[12px] font-semibold text-zinc-300">Include Hidden Fields</p>
            <button onClick={() => updateConfig("includeHidden", !config.includeHidden)}
              className={`w-10 h-5 rounded-full border transition-all relative ${config.includeHidden ? "bg-white border-zinc-300" : "bg-zinc-700 border-zinc-600"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${config.includeHidden ? "left-5 bg-zinc-900" : "left-0.5 bg-white"}`} />
            </button>
          </div>
        </>
      )}

      {op === "getResponse" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Response Token</label>
          <SmartVariableInput value={config.responseToken || ""} onChange={(v) => updateConfig("responseToken", v)} placeholder="{{ $json.token }}" />
        </div>
      )}

      {op === "createForm" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Form Title</label>
            <SmartVariableInput value={config.title || ""} onChange={(v) => updateConfig("title", v)} placeholder="Customer Feedback Survey" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Fields (JSON array)</label>
            <SmartVariableInput value={config.fields || ""} onChange={(v) => updateConfig("fields", v)} placeholder='[{"type":"short_text","title":"Your name"}]' multiline />
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="zinc" label="Typeform Personal Access Token" placeholder="Select Typeform credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">items[ ], total_items, page_count, token</span>
      </div>
    </div>
  );
}
