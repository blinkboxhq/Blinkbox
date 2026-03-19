import { Code2, AlertTriangle } from "lucide-react";

export default function CodeNode({ config, updateConfig }) {
  const code = config.code || "";

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-lime-500/10 border border-lime-500/20 rounded-xl">
        <div className="p-2 bg-lime-500/20 rounded-lg text-lime-400 shrink-0">
          <Code2 className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-lime-400">Run Code</span>
          <span className="text-[10px] text-zinc-400 leading-relaxed">
            Sandboxed JavaScript. Use <code className="text-lime-300">$input</code> to read data and mutate <code className="text-lime-300">$output</code> to return it.
          </span>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          Code
        </label>
        <textarea
          value={code}
          onChange={(e) => updateConfig("code", e.target.value)}
          placeholder={`// Example: filter and transform\n$output.items = $input.data\n  .filter(item => item.active)\n  .map(item => ({\n    name: item.name,\n    email: item.email\n  }));`}
          spellCheck={false}
          className="w-full min-h-[220px] bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-[13px] font-mono text-lime-200 outline-none resize-y placeholder:text-zinc-700 focus:border-lime-500/50 focus:shadow-[0_0_15px_rgba(163,230,53,0.1)] transition-all leading-relaxed"
        />
      </div>

      {/* Sandbox Info */}
      <div className="flex items-start gap-2 p-3 bg-zinc-800/40 border border-zinc-700/30 rounded-lg">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500/70 mt-0.5 shrink-0" />
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          Runs in a V8 isolate — 64 MB memory, 2 second timeout. No <code className="text-zinc-400">require()</code>, no filesystem, no network access.
        </p>
      </div>
    </div>
  );
}
