import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";
import OAuthConnectButton from "@/components/ui/OAuthConnectButton";
import {
  Files, Search, Eye, FolderPlus, Upload, Download, FileOutput, Copy, Pencil,
  FilePenLine, MoveRight, Trash2, Trash, RotateCcw, Star, Share2, Link2, Users,
  UserCog, UserMinus, HardDrive, Gauge,
} from "lucide-react";

const ACCENT = "#FBBC04";

const GROUPS = [
  {
    title: "Files & Folders",
    ops: [
      { value: "listFiles", label: "List Files", icon: Files },
      { value: "search", label: "Search", icon: Search },
      { value: "getFile", label: "Get File", icon: Eye },
      { value: "createFolder", label: "Create Folder", icon: FolderPlus },
      { value: "uploadText", label: "Upload Text", icon: Upload },
      { value: "downloadText", label: "Download Text", icon: Download },
      { value: "exportFile", label: "Export (Docs)", icon: FileOutput },
      { value: "copyFile", label: "Copy File", icon: Copy },
      { value: "renameFile", label: "Rename File", icon: Pencil },
      { value: "updateFileContent", label: "Update Content", icon: FilePenLine },
      { value: "moveFile", label: "Move File", icon: MoveRight },
      { value: "starFile", label: "Star / Unstar", icon: Star },
    ],
  },
  {
    title: "Trash",
    ops: [
      { value: "deleteFile", label: "Delete Forever", icon: Trash2 },
      { value: "trashFile", label: "Move to Trash", icon: Trash },
      { value: "restoreFile", label: "Restore", icon: RotateCcw },
      { value: "emptyTrash", label: "Empty Trash", icon: Trash2 },
    ],
  },
  {
    title: "Sharing & Account",
    ops: [
      { value: "shareFile", label: "Share File", icon: Share2 },
      { value: "createSharedLink", label: "Shared Link", icon: Link2 },
      { value: "listPermissions", label: "List Access", icon: Users },
      { value: "updatePermission", label: "Update Access", icon: UserCog },
      { value: "removePermission", label: "Remove Access", icon: UserMinus },
      { value: "listDrives", label: "List Drives", icon: HardDrive },
      { value: "getAbout", label: "Storage Info", icon: Gauge },
    ],
  },
];

const lbl = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
const inputCls = "w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#FBBC04]/40";

const FILE_ID_OPS = ["getFile", "downloadText", "exportFile", "copyFile", "renameFile", "updateFileContent", "deleteFile", "trashFile", "restoreFile", "starFile", "shareFile", "createSharedLink", "listPermissions", "updatePermission", "removePermission"];
const ROLES = ["reader", "commenter", "writer", "owner"];

function DriveIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M7.71 3.5L1.15 15l3.43 5.5h15.84l3.43-5.5L17.29 3.5H7.71zM12 5.5l4.16 7H7.84L12 5.5zm-7.45 10l1.74-3h11.42l1.74 3H4.55z" />
    </svg>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className={lbl}>{label}</label>
      {children}
      {hint && <p className="text-[10px] text-zinc-600">{hint}</p>}
    </div>
  );
}

export default function GoogleDriveNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "listFiles";
  const set = (k) => (v) => updateConfig(k, v);

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#0F9D58]/5 border border-[#0F9D58]/20 rounded-xl">
        <div className="p-2 bg-[#0F9D58]/10 rounded-lg text-[#FBBC04] shrink-0">
          <DriveIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#FBBC04]">Google Drive</span>
          <span className="text-[10px] text-zinc-500">Files, folders, trash, sharing & account</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className={lbl}>Operation</label>
        {GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{group.title}</span>
            <div className="grid grid-cols-2 gap-2">
              {group.ops.map((o) => {
                const Icon = o.icon;
                const active = op === o.value;
                return (
                  <button key={o.value} onClick={() => updateConfig("operation", o.value)}
                    className={`flex items-center gap-2 py-2 px-2.5 rounded-lg border text-[11px] font-bold transition-all ${active ? "bg-[#FBBC04]/10 border-[#FBBC04]/40 text-[#FBBC04]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {op === "listFiles" && (
        <>
          <Field label="Folder ID (optional)" hint='Blank = "My Drive" root'><SmartVariableInput value={config.folderId || ""} onChange={set("folderId")} placeholder="root" /></Field>
          <Field label="MIME Type Filter (optional)"><SmartVariableInput value={config.mimeType || ""} onChange={set("mimeType")} placeholder="application/pdf" /></Field>
          <Field label="Limit">
            <input type="number" min="1" max="1000" value={config.limit || 50} onChange={(e) => updateConfig("limit", Number(e.target.value))} className={inputCls} />
          </Field>
        </>
      )}

      {op === "search" && (
        <>
          <Field label="Query"><SmartVariableInput value={config.query || ""} onChange={set("query")} placeholder="quarterly report" /></Field>
          <div className="flex items-center justify-between bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5">
            <span className="text-[11px] font-bold text-zinc-400">Search inside file contents</span>
            <button onClick={() => updateConfig("searchContent", !config.searchContent)}
              className={`w-10 h-5 rounded-full transition-all relative ${config.searchContent ? "bg-[#FBBC04]" : "bg-[#333]"}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${config.searchContent ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
          <Field label="Limit">
            <input type="number" min="1" max="1000" value={config.limit || 50} onChange={(e) => updateConfig("limit", Number(e.target.value))} className={inputCls} />
          </Field>
        </>
      )}

      {FILE_ID_OPS.includes(op) && (
        <Field label="File ID"><SmartVariableInput value={config.fileId || ""} onChange={set("fileId")} placeholder="{{n1.id}}" /></Field>
      )}

      {op === "createFolder" && (
        <>
          <Field label="Folder Name"><SmartVariableInput value={config.name || ""} onChange={set("name")} placeholder="Reports 2024" /></Field>
          <Field label="Parent Folder ID (optional)"><SmartVariableInput value={config.parentId || ""} onChange={set("parentId")} placeholder="root" /></Field>
        </>
      )}

      {op === "uploadText" && (
        <>
          <Field label="File Name"><SmartVariableInput value={config.name || ""} onChange={set("name")} placeholder="report.csv" /></Field>
          <Field label="Content"><SmartVariableInput value={config.content || ""} onChange={set("content")} placeholder="{{n1.csv}}" multiline /></Field>
          <Field label="MIME Type (optional)"><input value={config.mimeType || ""} onChange={(e) => updateConfig("mimeType", e.target.value)} placeholder="text/csv" className={inputCls} /></Field>
          <Field label="Folder ID (optional)"><SmartVariableInput value={config.folderId || ""} onChange={set("folderId")} placeholder="root" /></Field>
        </>
      )}

      {op === "updateFileContent" && (
        <>
          <Field label="New Content"><SmartVariableInput value={config.content || ""} onChange={set("content")} placeholder="{{n1.text}}" multiline /></Field>
          <Field label="MIME Type (optional)"><input value={config.mimeType || ""} onChange={(e) => updateConfig("mimeType", e.target.value)} placeholder="text/plain" className={inputCls} /></Field>
        </>
      )}

      {op === "exportFile" && (
        <Field label="Export MIME Type" hint="e.g. application/pdf, text/plain, text/csv">
          <input value={config.exportMimeType || ""} onChange={(e) => updateConfig("exportMimeType", e.target.value)} placeholder="application/pdf" className={inputCls} />
        </Field>
      )}

      {op === "copyFile" && (
        <>
          <Field label="New Name (optional)"><SmartVariableInput value={config.name || ""} onChange={set("name")} placeholder="Copy of report" /></Field>
          <Field label="Destination Folder ID (optional)"><SmartVariableInput value={config.parentId || ""} onChange={set("parentId")} placeholder="root" /></Field>
        </>
      )}

      {op === "renameFile" && (
        <Field label="New Name"><SmartVariableInput value={config.name || ""} onChange={set("name")} placeholder="final-report.pdf" /></Field>
      )}

      {op === "moveFile" && (
        <>
          <Field label="File ID"><SmartVariableInput value={config.fileId || ""} onChange={set("fileId")} placeholder="{{n1.id}}" /></Field>
          <Field label="Target Folder ID"><SmartVariableInput value={config.targetFolderId || ""} onChange={set("targetFolderId")} placeholder="{{n1.folderId}}" /></Field>
        </>
      )}

      {op === "starFile" && (
        <div className="flex items-center justify-between bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5">
          <span className="text-[11px] font-bold text-zinc-400">Starred</span>
          <button onClick={() => updateConfig("starred", config.starred === false)}
            className={`w-10 h-5 rounded-full transition-all relative ${config.starred !== false ? "bg-[#FBBC04]" : "bg-[#333]"}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${config.starred !== false ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      )}

      {op === "shareFile" && (
        <>
          <Field label="Share With">
            <div className="grid grid-cols-4 gap-1.5">
              {["user", "group", "domain", "anyone"].map((t) => (
                <button key={t} onClick={() => updateConfig("shareType", t)}
                  className={`py-2 rounded-lg border text-[11px] font-bold capitalize transition-all ${(config.shareType || "user") === t ? "bg-[#FBBC04]/10 border-[#FBBC04]/40 text-[#FBBC04]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
                  {t}
                </button>
              ))}
            </div>
          </Field>
          {["user", "group"].includes(config.shareType || "user") && (
            <Field label="Email"><SmartVariableInput value={config.email || ""} onChange={set("email")} placeholder="colleague@example.com" /></Field>
          )}
          {(config.shareType === "domain") && (
            <Field label="Domain"><input value={config.domain || ""} onChange={(e) => updateConfig("domain", e.target.value)} placeholder="example.com" className={inputCls} /></Field>
          )}
          <Field label="Role">
            <div className="grid grid-cols-4 gap-1.5">
              {ROLES.map((r) => (
                <button key={r} onClick={() => updateConfig("role", r)}
                  className={`py-2 rounded-lg border text-[11px] font-bold capitalize transition-all ${(config.role || "reader") === r ? "bg-[#FBBC04]/10 border-[#FBBC04]/40 text-[#FBBC04]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
                  {r}
                </button>
              ))}
            </div>
          </Field>
        </>
      )}

      {op === "createSharedLink" && (
        <Field label="Link Role">
          <div className="grid grid-cols-3 gap-1.5">
            {["reader", "commenter", "writer"].map((r) => (
              <button key={r} onClick={() => updateConfig("role", r)}
                className={`py-2 rounded-lg border text-[11px] font-bold capitalize transition-all ${(config.role || "reader") === r ? "bg-[#FBBC04]/10 border-[#FBBC04]/40 text-[#FBBC04]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
                {r}
              </button>
            ))}
          </div>
        </Field>
      )}

      {["updatePermission", "removePermission"].includes(op) && (
        <Field label="Permission ID" hint="From a List Access run"><SmartVariableInput value={config.permissionId || ""} onChange={set("permissionId")} placeholder="{{n1.permissions[0].id}}" /></Field>
      )}

      {op === "updatePermission" && (
        <Field label="New Role">
          <div className="grid grid-cols-4 gap-1.5">
            {ROLES.map((r) => (
              <button key={r} onClick={() => updateConfig("role", r)}
                className={`py-2 rounded-lg border text-[11px] font-bold capitalize transition-all ${(config.role || "reader") === r ? "bg-[#FBBC04]/10 border-[#FBBC04]/40 text-[#FBBC04]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
                {r}
              </button>
            ))}
          </div>
        </Field>
      )}

      {op === "emptyTrash" && (
        <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
          Permanently deletes every file in trash. This cannot be undone.
        </div>
      )}

      <OAuthConnectButton provider="google" providerLabel="Google" accentColor="yellow"
        value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)} icon={DriveIcon} />
      <p className="text-[10px] text-zinc-600 -mt-3">Or use an existing credential:</p>
      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="yellow" label="Google OAuth Token" placeholder="Select Google credential..." />
    </div>
  );
}
