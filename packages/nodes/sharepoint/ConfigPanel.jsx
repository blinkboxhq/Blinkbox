import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "getListItem",    label: "Get List Item" },
  { value: "createListItem", label: "Create List Item" },
  { value: "updateListItem", label: "Update List Item" },
  { value: "deleteListItem", label: "Delete List Item" },
  { value: "listItems",      label: "List Items" },
  { value: "uploadFile",     label: "Upload File" },
  { value: "listFiles",      label: "List Library Files" },
];

export default function SharePointNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "listItems";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#0078D4]/10 border border-[#0078D4]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#0078D4">
            <path d="M12 2C9.243 2 7 4.243 7 7c0 2.115 1.29 3.93 3.143 4.714A5.005 5.005 0 002 16v1h11v5h9V7c0-2.757-2.243-5-5-5h-5zm0 2h5c1.654 0 3 1.346 3 3v14h-5v-5H2v-1c0-1.654 1.346-3 3-3 .256 0 .506.033.748.086A5.014 5.014 0 009 7c0-1.654 1.346-3 3-3z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">SharePoint</div>
          <div className="text-[11px] text-zinc-500">Lists, libraries, items, files</div>
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

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Site URL</label>
        <SmartVariableInput value={config.siteUrl || ""} onChange={(v) => updateConfig("siteUrl", v)} placeholder="https://company.sharepoint.com/sites/MySite" />
      </div>

      {!["uploadFile","listFiles"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">List Name</label>
          <SmartVariableInput value={config.listName || ""} onChange={(v) => updateConfig("listName", v)} placeholder="Tasks" />
        </div>
      )}

      {["getListItem","updateListItem","deleteListItem"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Item ID</label>
          <SmartVariableInput value={config.itemId || ""} onChange={(v) => updateConfig("itemId", v)} placeholder="{{ $json.id }}" />
        </div>
      )}

      {(op === "createListItem" || op === "updateListItem") && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Fields (JSON object)</label>
          <SmartVariableInput value={config.fields || ""} onChange={(v) => updateConfig("fields", v)} placeholder='{"Title":"New Task","Status":"Active","AssignedTo":"{{ $json.user }}"}' multiline />
        </div>
      )}

      {op === "listItems" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Filter (OData, optional)</label>
            <SmartVariableInput value={config.filter || ""} onChange={(v) => updateConfig("filter", v)} placeholder="Status eq 'Active'" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Limit</label>
            <SmartVariableInput value={config.limit || "100"} onChange={(v) => updateConfig("limit", v)} placeholder="100" />
          </div>
        </>
      )}

      {op === "uploadFile" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Library Name</label>
            <SmartVariableInput value={config.libraryName || "Documents"} onChange={(v) => updateConfig("libraryName", v)} placeholder="Documents" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">File Name</label>
            <SmartVariableInput value={config.fileName || ""} onChange={(v) => updateConfig("fileName", v)} placeholder="{{ $json.filename }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">File Content (base64)</label>
            <SmartVariableInput value={config.content || ""} onChange={(v) => updateConfig("content", v)} placeholder="{{ $json.fileBase64 }}" />
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Microsoft 365 (OAuth)" placeholder="Select SharePoint credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, fields, webUrl, createdDateTime</span>
      </div>
    </div>
  );
}
