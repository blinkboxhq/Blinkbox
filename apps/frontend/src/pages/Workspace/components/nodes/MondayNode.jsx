import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "createItem",   label: "Create Item" },
  { value: "updateItem",   label: "Update Column" },
  { value: "getItem",      label: "Get Item" },
  { value: "listItems",    label: "List Items" },
  { value: "deleteItem",   label: "Delete Item" },
  { value: "createUpdate", label: "Post Update" },
  { value: "createBoard",  label: "Create Board" },
];

export default function MondayNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "createItem";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#FF3D57]/10 border border-[#FF3D57]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4">
            <circle cx="4.5" cy="12" r="3.5" fill="#FF3D57"/>
            <circle cx="12" cy="12" r="3.5" fill="#FFCC00"/>
            <circle cx="19.5" cy="12" r="3.5" fill="#00CA72"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Monday.com</div>
          <div className="text-[11px] text-zinc-500">Items, boards, columns, updates</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#FF3D57]/10 border-[#FF3D57]/40 text-[#FF3D57]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["createItem","listItems","createBoard"].indexOf(op) === -1 && op !== "createBoard" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Item ID</label>
          <SmartVariableInput nodeId={nodeId} value={config.itemId || ""} onChange={(v) => updateConfig("itemId", v)} placeholder="{{ $json.id }}" />
        </div>
      )}

      {["createItem","listItems"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Board ID</label>
          <SmartVariableInput nodeId={nodeId} value={config.boardId || ""} onChange={(v) => updateConfig("boardId", v)} placeholder="Monday board ID" />
        </div>
      )}

      {op === "createItem" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Item Name</label>
            <SmartVariableInput nodeId={nodeId} value={config.itemName || ""} onChange={(v) => updateConfig("itemName", v)} placeholder="{{ $json.name }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Column Values (JSON)</label>
            <SmartVariableInput nodeId={nodeId} value={config.columnValues || ""} onChange={(v) => updateConfig("columnValues", v)} placeholder='{"status":{"label":"Done"},"date4":{"date":"2024-01-01"}}' multiline />
          </div>
        </>
      )}

      {op === "updateItem" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Column ID</label>
            <SmartVariableInput nodeId={nodeId} value={config.columnId || ""} onChange={(v) => updateConfig("columnId", v)} placeholder="status" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Value (JSON)</label>
            <SmartVariableInput nodeId={nodeId} value={config.value || ""} onChange={(v) => updateConfig("value", v)} placeholder='{"label":"Done"}' />
          </div>
        </>
      )}

      {op === "createUpdate" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Update Body</label>
          <SmartVariableInput nodeId={nodeId} value={config.body || ""} onChange={(v) => updateConfig("body", v)} placeholder="Status update: {{ $json.message }}" multiline />
        </div>
      )}

      {op === "createBoard" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Board Name</label>
            <SmartVariableInput nodeId={nodeId} value={config.boardName || ""} onChange={(v) => updateConfig("boardName", v)} placeholder="Q3 Roadmap" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Board Kind</label>
            <div className="flex gap-1.5">
              {["public","private","share"].map((k) => (
                <button key={k} onClick={() => updateConfig("boardKind", k)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(config.boardKind||"public") === k ? "bg-[#FF3D57]/10 border-[#FF3D57]/40 text-[#FF3D57]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {k}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Monday.com API Token" placeholder="Select Monday credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, name, board_id, column_values, created_at</span>
      </div>
    </div>
  );
}
