import { Database } from 'lucide-react';
import CredentialPicker from "@/components/ui/CredentialPicker";
import SmartVariableInput from "@/components/ui/SmartVariableInput";

const OPERATIONS = [
  { id: "get",       label: "Get" },
  { id: "set",       label: "Set" },
  { id: "del",       label: "Del" },
  { id: "exists",    label: "Exists" },
  { id: "incr",      label: "Incr" },
  { id: "decr",      label: "Decr" },
  { id: "expire",    label: "Expire" },
  { id: "ttl",       label: "TTL" },
  { id: "lpush",     label: "LPush" },
  { id: "rpush",     label: "RPush" },
  { id: "lrange",    label: "LRange" },
  { id: "sadd",      label: "SAdd" },
  { id: "smembers",  label: "SMembers" },
  { id: "hset",      label: "HSet" },
  { id: "hget",      label: "HGet" },
  { id: "hgetall",   label: "HGetAll" },
  { id: "keys",      label: "Keys" },
  { id: "publish",   label: "Publish" },
];

export default function RedisNode({ config = {}, updateConfig, nodeId, nodes, edges }) {
  const op = config.operation || "get";
  const needsKey    = op !== "keys";
  const needsValue  = ["set", "lpush", "rpush", "incr", "decr", "sadd"].includes(op);
  const needsTtl    = ["set", "expire"].includes(op);
  const needsField  = ["hset", "hget"].includes(op);
  const isList      = op === "lrange";
  const isPattern   = op === "keys";
  const isPublish   = op === "publish";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-[#DC382D]/10 border border-[#DC382D]/20 flex items-center justify-center shrink-0">
          <Database className="w-4 h-4 text-[#DC382D]" />
        </div>
        <div>
          <span className="text-sm font-bold text-red-400">Redis</span>
          <p className="text-[10px] text-zinc-500 mt-0.5">In-memory key-value store — cache, queues, pub/sub</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Credential</label>
        <CredentialPicker value={config.credentialId || ""} onChange={v => updateConfig("credentialId", v)} type="Redis" />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="flex gap-1.5 flex-wrap">
          {OPERATIONS.map(o => (
            <button key={o.id} onClick={() => updateConfig("operation", o.id)}
              className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                op === o.id ? "bg-red-500/10 border-red-400/40 text-red-300"
                            : "bg-[#0a0a0a] border-[#222] text-zinc-500 hover:border-[#333]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key */}
      {needsKey && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Key</label>
          <SmartVariableInput value={config.key || ""} onChange={v => updateConfig("key", v)}
            placeholder="e.g. user:{{trigger.userId}}:session" nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
      )}

      {/* Field (hash) */}
      {needsField && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Field</label>
          <SmartVariableInput value={config.field || ""} onChange={v => updateConfig("field", v)}
            placeholder="e.g. email" nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
      )}

      {/* Value */}
      {needsValue && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Value</label>
          <SmartVariableInput value={config.value || ""} onChange={v => updateConfig("value", v)}
            placeholder={op === "incr" || op === "decr" ? "Amount (default 1)" : "e.g. {{trigger.data}}"}
            nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
      )}

      {/* TTL */}
      {needsTtl && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {op === "expire" ? "TTL (seconds) *" : "TTL (seconds, optional)"}
          </label>
          <SmartVariableInput value={config.ttl || ""} onChange={v => updateConfig("ttl", v)}
            placeholder="e.g. 3600 (1 hour)" nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
      )}

      {/* LRange range */}
      {isList && (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Start</label>
            <input type="number" value={config.start ?? 0} onChange={e => updateConfig("start", parseInt(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500/40" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Stop</label>
            <input type="number" value={config.stop ?? -1} onChange={e => updateConfig("stop", parseInt(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500/40" />
          </div>
        </div>
      )}

      {/* Pattern for KEYS */}
      {isPattern && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pattern</label>
          <SmartVariableInput value={config.pattern || "*"} onChange={v => updateConfig("pattern", v)}
            placeholder="e.g. user:* or session:*" nodeId={nodeId} nodes={nodes} edges={edges} />
        </div>
      )}

      {/* Pub/sub */}
      {isPublish && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Channel</label>
            <SmartVariableInput value={config.channel || ""} onChange={v => updateConfig("channel", v)}
              placeholder="e.g. notifications" nodeId={nodeId} nodes={nodes} edges={edges} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Message</label>
            <SmartVariableInput value={config.message || ""} onChange={v => updateConfig("message", v)}
              placeholder="e.g. {{trigger.text}}" nodeId={nodeId} nodes={nodes} edges={edges} />
          </div>
        </>
      )}

      <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] font-mono text-[10px] leading-relaxed">
        <div className="text-zinc-600 mb-1">// output</div>
        <div><span className="text-sky-400">value</span><span className="text-zinc-600">: </span><span className="text-amber-300">any</span><span className="text-zinc-600"> // get/incr</span></div>
        <div><span className="text-sky-400">items</span><span className="text-zinc-600">:  </span><span className="text-amber-300">array</span><span className="text-zinc-600"> // lrange</span></div>
        <div><span className="text-sky-400">found</span><span className="text-zinc-600">:  </span><span className="text-amber-300">boolean</span></div>
        <div><span className="text-sky-400">key</span><span className="text-zinc-600">:   </span><span className="text-amber-300">string</span></div>
      </div>
    </div>
  );
}
