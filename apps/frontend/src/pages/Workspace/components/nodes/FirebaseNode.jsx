import CredentialPicker from "../../../../components/ui/CredentialPicker";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

const OPERATIONS = [
  { id: "getDocument",    label: "Get Doc" },
  { id: "setDocument",    label: "Set Doc" },
  { id: "addDocument",    label: "Add Doc" },
  { id: "updateDocument", label: "Update Doc" },
  { id: "deleteDocument", label: "Delete Doc" },
  { id: "queryCollection", label: "Query" },
  { id: "getUser",        label: "Get User" },
  { id: "createUser",     label: "Create User" },
  { id: "deleteUser",     label: "Delete User" },
  { id: "sendNotification", label: "Push Notif" },
];

const OPERATORS = ["==", "!=", "<", "<=", ">", ">=", "array-contains", "in"];

export default function FirebaseNode({ config = {}, updateConfig, nodeId, nodes, edges }) {
  const op = config.operation || "getDocument";
  const isFirestore = ["getDocument","setDocument","addDocument","updateDocument","deleteDocument","queryCollection"].includes(op);
  const needsDocId  = ["getDocument","setDocument","updateDocument","deleteDocument"].includes(op);
  const needsData   = ["setDocument","addDocument","updateDocument"].includes(op);
  const isQuery     = op === "queryCollection";
  const isAuth      = ["getUser","createUser","deleteUser"].includes(op);
  const isPush      = op === "sendNotification";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
        <span className="text-sm font-bold text-orange-400">Firebase</span>
        <p className="text-[10px] text-zinc-500 mt-0.5">Firestore, Auth & Push Notifications</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Credential (Service Account JSON)</label>
        <CredentialPicker value={config.credentialId || ""} onChange={v => updateConfig("credentialId", v)} type="Firebase" />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="flex gap-1.5 flex-wrap">
          {OPERATIONS.map(o => (
            <button key={o.id} onClick={() => updateConfig("operation", o.id)}
              className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                op === o.id ? "bg-orange-500/10 border-orange-400/40 text-orange-300"
                            : "bg-[#0a0a0a] border-[#222] text-zinc-500 hover:border-[#333]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Firestore */}
      {isFirestore && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Collection</label>
          <SmartVariableInput value={config.collection || ""} onChange={v => updateConfig("collection", v)}
            placeholder="e.g. users" nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
      )}

      {needsDocId && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Document ID</label>
          <SmartVariableInput value={config.docId || ""} onChange={v => updateConfig("docId", v)}
            placeholder="e.g. {{trigger.userId}}" nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
      )}

      {op === "setDocument" && (
        <div className="flex items-center gap-2">
          <input type="checkbox" id="merge" checked={config.merge === true}
            onChange={e => updateConfig("merge", e.target.checked)}
            className="rounded border-zinc-700" />
          <label htmlFor="merge" className="text-xs text-zinc-400">Merge (don't overwrite existing fields)</label>
        </div>
      )}

      {needsData && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {op === "updateDocument" ? "Update Data (JSON)" : "Data (JSON)"}
          </label>
          <SmartVariableInput value={config[op === "updateDocument" ? "updateData" : "data"] || ""}
            onChange={v => updateConfig(op === "updateDocument" ? "updateData" : "data", v)}
            placeholder='{"name": "Alice", "score": 100}' multiline rows={4}
            nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
      )}

      {/* Query */}
      {isQuery && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Where Field</label>
              <SmartVariableInput value={config.field || ""} onChange={v => updateConfig("field", v)}
                placeholder="e.g. role" nodeId={nodeId} nodes={nodes} edges={edges} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operator</label>
              <select value={config.operator || "=="} onChange={e => updateConfig("operator", e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-2 py-2 text-xs text-white focus:outline-none appearance-none">
                {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Value</label>
              <SmartVariableInput value={config.filterValue || ""} onChange={v => updateConfig("filterValue", v)}
                placeholder="e.g. admin" nodeId={nodeId} nodes={nodes} edges={edges} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Order By</label>
              <SmartVariableInput value={config.orderBy || ""} onChange={v => updateConfig("orderBy", v)}
                placeholder="e.g. createdAt" nodeId={nodeId} nodes={nodes} edges={edges} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Limit</label>
              <input type="number" min="1" max="1000"
                value={config.limit || 100} onChange={e => updateConfig("limit", parseInt(e.target.value))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500/40" />
            </div>
          </div>
        </>
      )}

      {/* Auth ops */}
      {op === "getUser" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">User ID</label>
            <SmartVariableInput value={config.userId || ""} onChange={v => updateConfig("userId", v)}
              placeholder="UID" nodeId={nodeId} nodes={nodes} edges={edges} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Or Email</label>
            <SmartVariableInput value={config.email || ""} onChange={v => updateConfig("email", v)}
              placeholder="email@example.com" nodeId={nodeId} nodes={nodes} edges={edges} />
          </div>
        </div>
      )}

      {op === "createUser" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Email *</label>
            <SmartVariableInput value={config.email || ""} onChange={v => updateConfig("email", v)}
              placeholder="{{trigger.email}}" nodeId={nodeId} nodes={nodes} edges={edges} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Password</label>
              <SmartVariableInput value={config.password || ""} onChange={v => updateConfig("password", v)}
                placeholder="optional" nodeId={nodeId} nodes={nodes} edges={edges} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Display Name</label>
              <SmartVariableInput value={config.displayName || ""} onChange={v => updateConfig("displayName", v)}
                placeholder="Alice" nodeId={nodeId} nodes={nodes} edges={edges} />
            </div>
          </div>
        </div>
      )}

      {op === "deleteUser" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">User ID</label>
          <SmartVariableInput value={config.userId || ""} onChange={v => updateConfig("userId", v)}
            placeholder="{{trigger.uid}}" nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
      )}

      {/* Push notification */}
      {isPush && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">FCM Token</label>
            <SmartVariableInput value={config.fcmToken || ""} onChange={v => updateConfig("fcmToken", v)}
              placeholder="{{trigger.fcmToken}}" nodeId={nodeId} nodes={nodes} edges={edges} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Notification (JSON)</label>
            <SmartVariableInput value={config.notification || ""} onChange={v => updateConfig("notification", v)}
              placeholder='{"title": "Hello", "body": "You have a new message"}' multiline rows={3}
              nodeId={nodeId} nodes={nodes} edges={edges} />
          </div>
        </>
      )}

      <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] font-mono text-[10px] leading-relaxed">
        <div className="text-zinc-600 mb-1">// output</div>
        <div><span className="text-sky-400">document</span><span className="text-zinc-600">:  </span><span className="text-amber-300">object</span><span className="text-zinc-600"> // get/set ops</span></div>
        <div><span className="text-sky-400">documents</span><span className="text-zinc-600">: </span><span className="text-amber-300">array</span><span className="text-zinc-600">  // query</span></div>
        <div><span className="text-sky-400">user</span><span className="text-zinc-600">:      </span><span className="text-amber-300">object</span><span className="text-zinc-600"> // auth ops</span></div>
        <div><span className="text-sky-400">docId</span><span className="text-zinc-600">:     </span><span className="text-amber-300">string</span><span className="text-zinc-600"> // addDocument</span></div>
      </div>
    </div>
  );
}
