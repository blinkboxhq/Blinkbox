import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";
import OAuthConnectButton from "../../../../components/ui/OAuthConnectButton";

const OPERATIONS = [
  { value: "listFiles",    label: "List Files" },
  { value: "getFile",      label: "Get File" },
  { value: "createFolder", label: "Create Folder" },
  { value: "uploadText",   label: "Upload Text File" },
  { value: "downloadText", label: "Download as Text" },
  { value: "deleteFile",   label: "Delete File" },
  { value: "moveFile",     label: "Move File" },
  { value: "shareFile",    label: "Share File" },
];

function DriveIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M7.71 3.5L1.15 15l3.43 5.5h15.84l3.43-5.5L17.29 3.5H7.71zM12 5.5l4.16 7H7.84L12 5.5zm-7.45 10l1.74-3h11.42l1.74 3H4.55z"/>
    </svg>
  );
}

export default function GoogleDriveNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "listFiles";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#0F9D58]/5 border border-[#0F9D58]/20 rounded-xl">
        <div className="p-2 bg-[#0F9D58]/10 rounded-lg text-[#FBBC04] shrink-0">
          <DriveIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#FBBC04]">Google Drive</span>
          <span className="text-[10px] text-zinc-500">Files, folders, upload, share</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-1.5">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-2 rounded-lg border text-xs font-bold transition-all ${op === o.value ? "bg-[#FBBC04]/10 border-[#FBBC04]/40 text-[#FBBC04]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["listFiles"].includes(op) && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Folder ID (optional)</label>
            <SmartVariableInput value={config.folderId || ""} onChange={(v) => updateConfig("folderId", v)} placeholder="root" nodeId={nodeId} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Limit</label>
            <input type="number" min="1" max="1000" value={config.limit || 50} onChange={(e) => updateConfig("limit", Number(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#FBBC04]/40" />
          </div>
        </>
      )}

      {["getFile", "downloadText", "deleteFile", "shareFile"].includes(op) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">File ID</label>
          <SmartVariableInput value={config.fileId || ""} onChange={(v) => updateConfig("fileId", v)} placeholder="{{n1.id}}" />
        </div>
      )}

      {op === "createFolder" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Folder Name</label>
            <SmartVariableInput value={config.name || ""} onChange={(v) => updateConfig("name", v)} placeholder="Reports 2024" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Parent Folder ID (optional)</label>
            <SmartVariableInput value={config.parentId || ""} onChange={(v) => updateConfig("parentId", v)} placeholder="root" />
          </div>
        </>
      )}

      {op === "uploadText" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">File Name</label>
            <SmartVariableInput value={config.name || ""} onChange={(v) => updateConfig("name", v)} placeholder="report.csv" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Content</label>
            <SmartVariableInput value={config.content || ""} onChange={(v) => updateConfig("content", v)} placeholder="{{n1.csv}}" multiline />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Folder ID (optional)</label>
            <SmartVariableInput value={config.folderId || ""} onChange={(v) => updateConfig("folderId", v)} placeholder="root" nodeId={nodeId} />
          </div>
        </>
      )}

      {op === "moveFile" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">File ID</label>
            <SmartVariableInput value={config.fileId || ""} onChange={(v) => updateConfig("fileId", v)} placeholder="{{n1.id}}" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Folder ID</label>
            <SmartVariableInput value={config.targetFolderId || ""} onChange={(v) => updateConfig("targetFolderId", v)} placeholder="{{n1.folderId}}" />
          </div>
        </>
      )}

      {op === "shareFile" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Email to Share With</label>
            <SmartVariableInput value={config.email || ""} onChange={(v) => updateConfig("email", v)} placeholder="colleague@example.com" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Role</label>
            <div className="grid grid-cols-3 gap-1.5">
              {["reader", "commenter", "writer"].map((r) => (
                <button key={r} onClick={() => updateConfig("role", r)}
                  className={`py-2 rounded-lg border text-xs font-bold capitalize transition-all ${(config.role || "reader") === r ? "bg-[#FBBC04]/10 border-[#FBBC04]/40 text-[#FBBC04]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <OAuthConnectButton provider="google" providerLabel="Google" accentColor="yellow"
        value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)} icon={DriveIcon} />
      <p className="text-[10px] text-zinc-600 -mt-3">Or use an existing credential:</p>
      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="yellow" label="Google OAuth Token" placeholder="Select Google credential..." />
    </div>
  );
}
