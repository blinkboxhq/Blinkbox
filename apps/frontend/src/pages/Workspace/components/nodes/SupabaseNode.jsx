import CredentialPicker from "../../../../components/ui/CredentialPicker";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

const OPERATIONS = [
  { id: "select",  label: "Select" },
  { id: "insert",  label: "Insert" },
  { id: "update",  label: "Update" },
  { id: "upsert",  label: "Upsert" },
  { id: "delete",  label: "Delete" },
  { id: "rpc",     label: "RPC" },
];

export default function SupabaseNode({ config = {}, updateConfig, nodeId, nodes, edges }) {
  const op = config.operation || "select";
  const needsTable    = op !== "rpc";
  const needsFilter   = ["select", "update", "delete"].includes(op);
  const needsData     = ["insert", "update", "upsert"].includes(op);
  const needsConflict = op === "upsert";
  const isSelect      = op === "select";
  const isRpc         = op === "rpc";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
        <span className="text-sm font-bold text-emerald-400">Supabase</span>
        <p className="text-[10px] text-zinc-500 mt-0.5">Postgres + Auth + Storage — hosted</p>
      </div>

      {/* Credential */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Credential</label>
        <CredentialPicker value={config.credentialId || ""} onChange={v => updateConfig("credentialId", v)} type="Supabase" />
      </div>

      {/* Operation */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="flex gap-1.5 flex-wrap">
          {OPERATIONS.map(o => (
            <button key={o.id} onClick={() => updateConfig("operation", o.id)}
              className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                op === o.id ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-300"
                            : "bg-[#0a0a0a] border-[#222] text-zinc-500 hover:border-[#333]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {needsTable && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Table</label>
          <SmartVariableInput value={config.table || ""} onChange={v => updateConfig("table", v)}
            placeholder="e.g. users" nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
      )}

      {/* Select columns */}
      {isSelect && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Columns</label>
          <SmartVariableInput value={config.column || "*"} onChange={v => updateConfig("column", v)}
            placeholder="* or id, name, email" nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
      )}

      {/* Filter (eq) */}
      {needsFilter && (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Filter Column</label>
            <SmartVariableInput value={config.filter || ""} onChange={v => updateConfig("filter", v)}
              placeholder="e.g. id" nodeId={nodeId} nodes={nodes} edges={edges} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Filter Value</label>
            <SmartVariableInput value={config.filterValue || ""} onChange={v => updateConfig("filterValue", v)}
              placeholder="e.g. {{trigger.id}}" nodeId={nodeId} nodes={nodes} edges={edges} />
          </div>
        </div>
      )}

      {/* Order + limit for select */}
      {isSelect && (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Order By</label>
            <SmartVariableInput value={config.orderBy || ""} onChange={v => updateConfig("orderBy", v)}
              placeholder="e.g. created_at" nodeId={nodeId} nodes={nodes} edges={edges} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Limit</label>
            <input type="number" min="1" max="10000"
              value={config.limit || 100} onChange={e => updateConfig("limit", parseInt(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500/40" />
          </div>
        </div>
      )}

      {/* Data payload */}
      {needsData && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Data (JSON)</label>
          <SmartVariableInput value={config.data || ""} onChange={v => updateConfig("data", v)}
            placeholder='{"name": "Alice", "email": "a@b.com"}'
            multiline rows={4} nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
      )}

      {/* Upsert conflict columns */}
      {needsConflict && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">On Conflict (column)</label>
          <SmartVariableInput value={config.conflictColumns || ""} onChange={v => updateConfig("conflictColumns", v)}
            placeholder="e.g. email" nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
      )}

      {/* RPC */}
      {isRpc && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Function Name</label>
            <SmartVariableInput value={config.rpcFunction || ""} onChange={v => updateConfig("rpcFunction", v)}
              placeholder="e.g. get_top_users" nodeId={nodeId} nodes={nodes} edges={edges} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Params (JSON)</label>
            <SmartVariableInput value={config.rpcParams || ""} onChange={v => updateConfig("rpcParams", v)}
              placeholder='{"limit": 10}' multiline rows={3} nodeId={nodeId} nodes={nodes} edges={edges} />
          </div>
        </>
      )}

      <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] font-mono text-[10px] leading-relaxed">
        <div className="text-zinc-600 mb-1">// output</div>
        <div><span className="text-sky-400">rows</span><span className="text-zinc-600">: </span><span className="text-amber-300">array</span></div>
        <div><span className="text-sky-400">count</span><span className="text-zinc-600">: </span><span className="text-amber-300">number</span></div>
        <div><span className="text-sky-400">table</span><span className="text-zinc-600">: </span><span className="text-amber-300">string</span></div>
      </div>
    </div>
  );
}
