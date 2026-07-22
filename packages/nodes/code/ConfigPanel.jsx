import { Terminal } from "lucide-react";

const JS_PLACEHOLDER = `// Access previous node data via the \`input\` object
const active = input.items.filter(i => i.active);

// Return the result for the next node
return { result: active };`;

export default function CodeNode({ config = {}, updateConfig }) {
  const code    = config.code || "";
  const timeout = config.timeout !== undefined ? config.timeout : 1;

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Terminal className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-violet-400">Run Code</span>
          <span className="text-[10px] text-zinc-500">Execute sandboxed JavaScript — no filesystem or network access</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">JavaScript</label>
        <textarea
          value={code}
          onChange={e => updateConfig("code", e.target.value)}
          placeholder={JS_PLACEHOLDER}
          spellCheck={false}
          className="w-full min-h-[220px] bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-4 py-3 text-[12px] font-mono text-zinc-100 outline-none resize-y placeholder:text-zinc-700 focus:border-violet-500/40 transition-all leading-relaxed"
        />
      </div>

      <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] text-[11px] text-zinc-500">
        Read upstream data from the <span className="text-violet-300 font-mono">input</span> object — e.g. <span className="font-mono text-zinc-400">input.email</span>
      </div>

      <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] text-[11px] text-zinc-500">
        Pass data on with <span className="font-mono text-violet-300">return {"{ result: value }"}</span>
      </div>

      <div className="flex flex-col gap-2 w-40">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Timeout</label>
        <input type="number" min="1" max="5" step="1"
          value={timeout}
          onChange={e => updateConfig("timeout", Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
          className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-violet-500/40" />
        <p className="text-[10px] text-zinc-600">seconds (max 5)</p>
      </div>
    </div>
  );
}
