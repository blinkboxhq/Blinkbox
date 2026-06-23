import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "getFile",         label: "Get File" },
  { value: "getFileNodes",    label: "Get Nodes" },
  { value: "getComments",     label: "Get Comments" },
  { value: "postComment",     label: "Post Comment" },
  { value: "deleteComment",   label: "Delete Comment" },
  { value: "exportNode",      label: "Export Node (image)" },
  { value: "getStyles",       label: "Get Styles" },
  { value: "getComponents",   label: "Get Components" },
];

export default function FigmaNode({ config = {}, updateConfig }) {
  const op = config.operation || "getFile";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#F24E1E]/10 border border-[#F24E1E]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4">
            <path d="M8 24c2.208 0 4-1.792 4-4v-4H8c-2.208 0-4 1.792-4 4s1.792 4 4 4z" fill="#0ACF83"/>
            <path d="M4 12c0-2.208 1.792-4 4-4h4v8H8c-2.208 0-4-1.792-4-4z" fill="#A259FF"/>
            <path d="M4 4c0-2.208 1.792-4 4-4h4v8H8C5.792 8 4 6.208 4 4z" fill="#F24E1E"/>
            <path d="M12 0h4c2.208 0 4 1.792 4 4s-1.792 4-4 4h-4V0z" fill="#FF7262"/>
            <path d="M20 12c0 2.208-1.792 4-4 4s-4-1.792-4-4 1.792-4 4-4 4 1.792 4 4z" fill="#1ABCFE"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Figma</div>
          <div className="text-[11px] text-zinc-500">Files, nodes, comments, exports</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#F24E1E]/10 border-[#F24E1E]/40 text-[#F24E1E]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">File Key</label>
        <SmartVariableInput value={config.fileKey || ""} onChange={(v) => updateConfig("fileKey", v)} placeholder="From figma.com/file/XXXX/..." />
      </div>

      {["getFileNodes","exportNode"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Node IDs (comma-sep)</label>
          <SmartVariableInput value={config.nodeIds || ""} onChange={(v) => updateConfig("nodeIds", v)} placeholder="1:2,3:4" />
        </div>
      )}

      {op === "postComment" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Comment Message</label>
            <SmartVariableInput value={config.message || ""} onChange={(v) => updateConfig("message", v)} placeholder="Approved — ready for handoff 🎉" multiline />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Pin X (optional)</label>
              <SmartVariableInput value={config.x || ""} onChange={(v) => updateConfig("x", v)} placeholder="100" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Pin Y (optional)</label>
              <SmartVariableInput value={config.y || ""} onChange={(v) => updateConfig("y", v)} placeholder="200" />
            </div>
          </div>
        </>
      )}

      {op === "deleteComment" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Comment ID</label>
          <SmartVariableInput value={config.commentId || ""} onChange={(v) => updateConfig("commentId", v)} placeholder="{{ $json.id }}" />
        </div>
      )}

      {op === "exportNode" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Export Format</label>
            <div className="flex gap-1.5">
              {["png","jpg","svg","pdf"].map((f) => (
                <button key={f} onClick={() => updateConfig("format", f)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all uppercase ${(config.format||"png") === f ? "bg-[#F24E1E]/10 border-[#F24E1E]/40 text-[#F24E1E]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Scale (1x = 1)</label>
            <div className="flex gap-1.5">
              {[1,2,3,4].map((s) => (
                <button key={s} onClick={() => updateConfig("scale", s)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(config.scale||1) === s ? "bg-[#F24E1E]/10 border-[#F24E1E]/40 text-[#F24E1E]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="orange" label="Figma Personal Access Token" placeholder="Select Figma credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">name, nodes, comments, images (base64 URLs)</span>
      </div>
    </div>
  );
}
