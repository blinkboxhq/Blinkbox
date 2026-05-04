import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "uploadFile",    label: "Upload File" },
  { value: "downloadFile",  label: "Download File" },
  { value: "listFiles",     label: "List Files" },
  { value: "deleteFile",    label: "Delete File" },
  { value: "createFolder",  label: "Create Folder" },
  { value: "moveFile",      label: "Move / Rename" },
  { value: "shareFile",     label: "Create Share Link" },
  { value: "getFileInfo",   label: "Get File Info" },
];

export default function OneDriveNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "uploadFile";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#0078D4]/10 border border-[#0078D4]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#0078D4">
            <path d="M17.5 12.5a5.5 5.5 0 00-5.5-5.5 5.47 5.47 0 00-4.22 1.99A3.99 3.99 0 004 13a4 4 0 004 4h9a3.5 3.5 0 000-7 3.54 3.54 0 00-.5.04z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">OneDrive</div>
          <div className="text-[11px] text-zinc-500">Files, folders, sharing via Microsoft</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#0078D4]/10 border-[#0078D4]/40 text-[#0078D4]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {op === "uploadFile" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Destination Path</label>
            <SmartVariableInput value={config.path || ""} onChange={(v) => updateConfig("path", v)} placeholder="/reports/{{ $json.filename }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">File Content (base64 or URL)</label>
            <SmartVariableInput value={config.content || ""} onChange={(v) => updateConfig("content", v)} placeholder="{{ $json.fileBase64 }}" />
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <p className="text-[12px] font-semibold text-zinc-300">Overwrite if exists</p>
            <button onClick={() => updateConfig("overwrite", !config.overwrite)}
              className={`w-10 h-5 rounded-full border transition-all relative ${config.overwrite ? "bg-[#0078D4] border-blue-400" : "bg-zinc-700 border-zinc-600"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.overwrite ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        </>
      )}

      {["downloadFile","deleteFile","shareFile","getFileInfo"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">File Path or Item ID</label>
          <SmartVariableInput value={config.path || ""} onChange={(v) => updateConfig("path", v)} placeholder="/documents/report.pdf or item ID" />
        </div>
      )}

      {op === "listFiles" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Folder Path (blank = root)</label>
          <SmartVariableInput value={config.folderPath || ""} onChange={(v) => updateConfig("folderPath", v)} placeholder="/reports/q3" />
        </div>
      )}

      {op === "createFolder" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Folder Path</label>
          <SmartVariableInput value={config.folderPath || ""} onChange={(v) => updateConfig("folderPath", v)} placeholder="/reports/{{ $json.month }}" />
        </div>
      )}

      {op === "moveFile" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Source Path</label>
            <SmartVariableInput value={config.sourcePath || ""} onChange={(v) => updateConfig("sourcePath", v)} placeholder="/inbox/file.pdf" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Destination Path</label>
            <SmartVariableInput value={config.destPath || ""} onChange={(v) => updateConfig("destPath", v)} placeholder="/archive/file.pdf" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">New Name (optional)</label>
            <SmartVariableInput value={config.newName || ""} onChange={(v) => updateConfig("newName", v)} placeholder="report-final.pdf" />
          </div>
        </>
      )}

      {op === "shareFile" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Link Type</label>
            <div className="flex gap-1.5">
              {["view","edit","embed"].map((t) => (
                <button key={t} onClick={() => updateConfig("linkType", t)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(config.linkType||"view") === t ? "bg-[#0078D4]/10 border-[#0078D4]/40 text-[#0078D4]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Scope</label>
            <div className="flex gap-1.5">
              {["anonymous","organization"].map((s) => (
                <button key={s} onClick={() => updateConfig("scope", s)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(config.scope||"anonymous") === s ? "bg-[#0078D4]/10 border-[#0078D4]/40 text-[#0078D4]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Microsoft 365 (OAuth)" placeholder="Select OneDrive credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, name, size, webUrl, createdDateTime</span>
      </div>
    </div>
  );
}
