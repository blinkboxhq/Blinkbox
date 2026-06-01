import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "createCard",   label: "Create Card" },
  { value: "updateCard",   label: "Update Card" },
  { value: "moveCard",     label: "Move Card" },
  { value: "archiveCard",  label: "Archive Card" },
  { value: "addComment",   label: "Add Comment" },
  { value: "addLabel",     label: "Add Label" },
  { value: "getCard",      label: "Get Card" },
  { value: "listCards",    label: "List Cards in List" },
];

export default function TrelloNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "createCard";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#0052CC]/10 border border-[#0052CC]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#0052CC">
            <path d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.656 1.343 3 3 3h18c1.656 0 3-1.344 3-3V3c0-1.657-1.344-3-3-3zM10.44 18.18c0 .795-.645 1.44-1.44 1.44H4.56c-.795 0-1.44-.645-1.44-1.44V5.82c0-.795.645-1.44 1.44-1.44H9c.795 0 1.44.645 1.44 1.44v12.36zm10.44-6c0 .794-.645 1.44-1.44 1.44H15c-.795 0-1.44-.646-1.44-1.44V5.82c0-.795.645-1.44 1.44-1.44h4.44c.795 0 1.44.645 1.44 1.44v6.36z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Trello</div>
          <div className="text-[11px] text-zinc-500">Cards, lists, boards, comments</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#0052CC]/10 border-[#0052CC]/40 text-[#0052CC]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["createCard","moveCard","listCards"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">List ID</label>
          <SmartVariableInput nodeId={nodeId} value={config.listId || ""} onChange={(v) => updateConfig("listId", v)} placeholder="Trello list ID" />
        </div>
      )}

      {["updateCard","moveCard","archiveCard","addComment","addLabel","getCard"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Card ID</label>
          <SmartVariableInput nodeId={nodeId} value={config.cardId || ""} onChange={(v) => updateConfig("cardId", v)} placeholder="{{ $json.card.id }}" />
        </div>
      )}

      {(op === "createCard" || op === "updateCard") && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Card Name</label>
            <SmartVariableInput nodeId={nodeId} value={config.name || ""} onChange={(v) => updateConfig("name", v)} placeholder="New task: {{ $json.title }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Description (optional)</label>
            <SmartVariableInput nodeId={nodeId} value={config.desc || ""} onChange={(v) => updateConfig("desc", v)} placeholder="Card description..." multiline />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Due Date (optional)</label>
            <SmartVariableInput nodeId={nodeId} value={config.due || ""} onChange={(v) => updateConfig("due", v)} placeholder="{{ $json.dueDate }}" />
          </div>
        </>
      )}

      {op === "addComment" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Comment Text</label>
          <SmartVariableInput nodeId={nodeId} value={config.text || ""} onChange={(v) => updateConfig("text", v)} placeholder="Comment added via Blinkbox: {{ $json.note }}" multiline />
        </div>
      )}

      {op === "addLabel" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Label Color</label>
            <div className="flex gap-1.5 flex-wrap">
              {["green","yellow","orange","red","purple","blue","sky","lime","pink","black"].map((c) => (
                <button key={c} onClick={() => updateConfig("labelColor", c)}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${config.labelColor === c ? "border-white text-white" : "border-zinc-700 text-zinc-500"}`}
                  style={{ background: c === "black" ? "#1a1a1a" : c }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Label Name (optional)</label>
            <SmartVariableInput nodeId={nodeId} value={config.labelName || ""} onChange={(v) => updateConfig("labelName", v)} placeholder="Priority" />
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Trello API Key + Token" placeholder="Select Trello credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, name, url, shortUrl, idList</span>
      </div>
    </div>
  );
}
