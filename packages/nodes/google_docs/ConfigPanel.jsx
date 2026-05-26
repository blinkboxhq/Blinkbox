import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "createDoc",      label: "Create Document" },
  { value: "getDoc",         label: "Get Document" },
  { value: "appendText",     label: "Append Text" },
  { value: "replaceText",    label: "Find & Replace" },
  { value: "insertTable",    label: "Insert Table" },
  { value: "listDocs",       label: "List Documents" },
  { value: "exportDoc",      label: "Export as PDF / DOCX" },
];

export default function GoogleDocsNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "createDoc";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#4285F4]/10 border border-[#4285F4]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#4285F4">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Google Docs</div>
          <div className="text-[11px] text-zinc-500">Create, read, edit Google Docs</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#4285F4]/10 border-[#4285F4]/40 text-[#4285F4]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["getDoc","appendText","replaceText","insertTable","exportDoc"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Document ID</label>
          <SmartVariableInput value={config.docId || ""} onChange={(v) => updateConfig("docId", v)} placeholder="{{ $json.docId }} or from Drive URL" />
        </div>
      )}

      {op === "createDoc" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Document Title</label>
            <SmartVariableInput value={config.title || ""} onChange={(v) => updateConfig("title", v)} placeholder="Weekly Report — {{ $json.week }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Initial Content (optional)</label>
            <SmartVariableInput value={config.content || ""} onChange={(v) => updateConfig("content", v)} placeholder="# Report\n\n{{ $json.summary }}" multiline />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Parent Folder ID (optional)</label>
            <SmartVariableInput value={config.folderId || ""} onChange={(v) => updateConfig("folderId", v)} placeholder="Drive folder ID" />
          </div>
        </>
      )}

      {op === "appendText" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Text to Append</label>
            <SmartVariableInput value={config.text || ""} onChange={(v) => updateConfig("text", v)} placeholder="{{ $json.entry }}" multiline />
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <p className="text-[12px] font-semibold text-zinc-300">Add timestamp prefix</p>
            <button onClick={() => updateConfig("addTimestamp", !config.addTimestamp)}
              className={`w-10 h-5 rounded-full border transition-all relative ${config.addTimestamp ? "bg-[#4285F4] border-blue-400" : "bg-zinc-700 border-zinc-600"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.addTimestamp ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        </>
      )}

      {op === "replaceText" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Find Text</label>
            <SmartVariableInput value={config.find || ""} onChange={(v) => updateConfig("find", v)} placeholder="{{PLACEHOLDER}}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Replace With</label>
            <SmartVariableInput value={config.replace || ""} onChange={(v) => updateConfig("replace", v)} placeholder="{{ $json.value }}" />
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <p className="text-[12px] font-semibold text-zinc-300">Replace all occurrences</p>
            <button onClick={() => updateConfig("replaceAll", !config.replaceAll)}
              className={`w-10 h-5 rounded-full border transition-all relative ${config.replaceAll !== false ? "bg-[#4285F4] border-blue-400" : "bg-zinc-700 border-zinc-600"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.replaceAll !== false ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        </>
      )}

      {op === "exportDoc" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Export Format</label>
          <div className="flex gap-1.5">
            {["pdf","docx","txt","html"].map((f) => (
              <button key={f} onClick={() => updateConfig("format", f)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all uppercase ${(config.format||"pdf") === f ? "bg-[#4285F4]/10 border-[#4285F4]/40 text-[#4285F4]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Google OAuth" placeholder="Select Google credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">documentId, title, body, revisionId</span>
      </div>
    </div>
  );
}
