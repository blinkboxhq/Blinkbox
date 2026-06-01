import { Database } from 'lucide-react';
import CredentialPicker from "../../../../components/ui/CredentialPicker";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

const OPERATIONS = [
  { id: "find",          label: "Find" },
  { id: "findOne",       label: "Find One" },
  { id: "insertOne",     label: "Insert One" },
  { id: "insertMany",    label: "Insert Many" },
  { id: "updateOne",     label: "Update One" },
  { id: "updateMany",    label: "Update Many" },
  { id: "deleteOne",     label: "Delete One" },
  { id: "deleteMany",    label: "Delete Many" },
  { id: "aggregate",     label: "Aggregate" },
  { id: "countDocuments", label: "Count" },
];

export default function MongoDBNode({ config = {}, updateConfig, nodeId, nodes, edges }) {
  const op = config.operation || "find";
  const isFind  = ["find", "findOne", "countDocuments"].includes(op);
  const isWrite = ["insertOne", "insertMany"].includes(op);
  const isUpdate = ["updateOne", "updateMany"].includes(op);
  const isDelete = op === "deleteOne" || op === "deleteMany";
  const needsFilter = !["insertOne", "insertMany", "aggregate"].includes(op);
  const isAggregate = op === "aggregate";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-[#47A248]/10 border border-[#47A248]/20 flex items-center justify-center shrink-0">
          <Database className="w-4 h-4 text-[#47A248]" />
        </div>
        <div>
          <span className="text-sm font-bold text-green-400">MongoDB</span>
          <p className="text-[10px] text-zinc-500 mt-0.5">Document database — query, insert, update, aggregate</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Credential</label>
        <CredentialPicker value={config.credentialId || ""} onChange={v => updateConfig("credentialId", v)} type="MongoDB" />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="flex gap-1.5 flex-wrap">
          {OPERATIONS.map(o => (
            <button key={o.id} onClick={() => updateConfig("operation", o.id)}
              className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                op === o.id ? "bg-green-500/10 border-green-400/40 text-green-300"
                            : "bg-[#0a0a0a] border-[#222] text-zinc-500 hover:border-[#333]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Database + Collection */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Database</label>
          <SmartVariableInput value={config.database || ""} onChange={v => updateConfig("database", v)}
            placeholder="mydb (optional)" nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Collection</label>
          <SmartVariableInput value={config.collection || ""} onChange={v => updateConfig("collection", v)}
            placeholder="users" nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
      </div>

      {/* Filter */}
      {needsFilter && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Filter (JSON)</label>
          <SmartVariableInput value={config.filter || ""} onChange={v => updateConfig("filter", v)}
            placeholder='{"email": "alice@example.com"}' multiline rows={3}
            nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
      )}

      {/* Document for insert */}
      {op === "insertOne" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Document (JSON)</label>
          <SmartVariableInput value={config.document || ""} onChange={v => updateConfig("document", v)}
            placeholder='{"name": "Alice", "email": "a@b.com"}' multiline rows={4}
            nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
      )}

      {op === "insertMany" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Documents (JSON Array)</label>
          <SmartVariableInput value={config.documents || ""} onChange={v => updateConfig("documents", v)}
            placeholder='[{"name": "Alice"}, {"name": "Bob"}]' multiline rows={5}
            nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
      )}

      {/* Update */}
      {isUpdate && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Update (JSON)</label>
            <SmartVariableInput value={config.update || ""} onChange={v => updateConfig("update", v)}
              placeholder='{"$set": {"status": "active"}}' multiline rows={3}
              nodeId={nodeId} nodes={nodes} edges={edges} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Upsert (insert if not found)</label>
            <button onClick={() => updateConfig("upsert", !config.upsert)}
              className={`relative w-10 h-5 rounded-full transition-all shrink-0 ${config.upsert ? "bg-green-500" : "bg-zinc-700"}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${config.upsert ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        </>
      )}

      {/* Aggregate pipeline */}
      {isAggregate && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pipeline (JSON Array)</label>
          <SmartVariableInput value={config.pipeline || ""} onChange={v => updateConfig("pipeline", v)}
            placeholder='[{"$match": {"status": "active"}}, {"$group": {"_id": "$role", "count": {"$sum": 1}}}]'
            multiline rows={6} nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
      )}

      {/* Limit for find */}
      {(op === "find") && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Limit</label>
          <input type="number" min="1" max="10000"
            value={config.limit || 100} onChange={e => updateConfig("limit", parseInt(e.target.value))}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500/40" />
        </div>
      )}

      <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] font-mono text-[10px] leading-relaxed">
        <div className="text-zinc-600 mb-1">// output</div>
        <div><span className="text-sky-400">documents</span><span className="text-zinc-600">: </span><span className="text-amber-300">array</span></div>
        <div><span className="text-sky-400">count</span><span className="text-zinc-600">: </span><span className="text-amber-300">number</span></div>
        <div><span className="text-sky-400">insertedId</span><span className="text-zinc-600">: </span><span className="text-amber-300">string</span><span className="text-zinc-600"> // insert ops</span></div>
        <div><span className="text-sky-400">modifiedCount</span><span className="text-zinc-600">: </span><span className="text-amber-300">number</span><span className="text-zinc-600"> // update ops</span></div>
      </div>
    </div>
  );
}
