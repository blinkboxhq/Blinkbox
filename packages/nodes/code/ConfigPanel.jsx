import { Terminal } from "lucide-react";

const LANGS = [
  { id: "javascript", label: "JavaScript" },
  { id: "python",     label: "Python" },
];

const JS_PLACEHOLDER = `// Access previous node data via \`input\` object
const filtered = input.items.filter(i => i.active);
return { result: filtered };`;

const PY_PLACEHOLDER = `# Access previous node data via input object
result = [i for i in input['items'] if i['active']]
return {'result': result}`;

export default function CodeNode({ config = {}, updateConfig, nodeId }) {
  const lang    = config.language || "javascript";
  const code    = config.code || "";
  const timeout = config.timeout !== undefined ? config.timeout : 10;
  const memory  = config.memory  !== undefined ? config.memory  : 128;

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Terminal className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-violet-400">Run Code</span>
          <span className="text-[10px] text-zinc-500">Execute custom logic in a sandboxed environment</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Language</label>
        <div className="flex gap-1.5">
          {LANGS.map(l => (
            <button key={l.id} onClick={() => updateConfig("language", l.id)}
              className={`px-4 py-1.5 rounded-full border text-[11px] font-bold transition-all ${
                lang === l.id
                  ? "bg-violet-500/10 border-violet-500/40 text-violet-300"
                  : "bg-[#0a0a0a] border-[#1a1a1a] text-zinc-500 hover:border-[#333]"}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Code</label>
        <textarea
          value={code}
          onChange={e => updateConfig("code", e.target.value)}
          placeholder={lang === "python" ? PY_PLACEHOLDER : JS_PLACEHOLDER}
          spellCheck={false}
          className="w-full min-h-[220px] bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-4 py-3 text-[12px] font-mono text-zinc-100 outline-none resize-y placeholder:text-zinc-700 focus:border-violet-500/40 transition-all leading-relaxed"
        />
      </div>

      <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] text-[11px] text-zinc-500">
        Access previous node data via <span className="text-violet-300 font-mono">input</span> object — e.g. <span className="font-mono text-zinc-400">input.email</span>
      </div>

      <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] text-[11px] text-zinc-500">
        Return data using: <span className="font-mono text-violet-300">return {"{ result: value }"}</span>
      </div>

      {lang === "python" && (
        <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/20 text-[11px] text-sky-400">
          Python runs in a sandboxed container — <span className="font-mono">numpy</span>, <span className="font-mono">pandas</span>, <span className="font-mono">requests</span> available
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Timeout</label>
          <div className="flex items-center gap-2">
            <input type="number" min="1" max="60"
              value={timeout}
              onChange={e => updateConfig("timeout", Math.min(60, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-violet-500/40" />
          </div>
          <p className="text-[10px] text-zinc-600">seconds (max 60)</p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Memory</label>
          <input type="number" min="32" max="512" step="32"
            value={memory}
            onChange={e => updateConfig("memory", parseInt(e.target.value) || 128)}
            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-violet-500/40" />
          <p className="text-[10px] text-zinc-600">MB</p>
        </div>
      </div>
    </div>
  );
}
