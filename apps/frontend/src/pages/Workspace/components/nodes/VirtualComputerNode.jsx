import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

const LANGUAGES = [
  { id: "bash",       label: "Bash" },
  { id: "python",     label: "Python" },
  { id: "node",       label: "Node.js" },
  { id: "powershell", label: "PowerShell" },
];

const PLACEHOLDERS = {
  bash:       "echo \"Hello from BlinkBox!\"\nls /tmp\ncurl -s https://api.example.com/data",
  python:     "import json\ndata = {\"message\": \"Hello from Python!\"}\nprint(json.dumps(data))",
  node:       "const data = { message: \"Hello from Node.js!\" };\nconsole.log(JSON.stringify(data));",
  powershell: "Write-Output \"Hello from PowerShell!\"\nGet-Date",
};

export default function VirtualComputerNode({ config = {}, updateConfig }) {
  const language = config.language || "bash";
  const envVars  = config.envVars  || [];

  function addEnvVar() {
    updateConfig("envVars", [...envVars, { key: "", value: "" }]);
  }

  function updateEnvVar(i, field, val) {
    const updated = envVars.map((e, idx) => idx === i ? { ...e, [field]: val } : e);
    updateConfig("envVars", updated);
  }

  function removeEnvVar(i) {
    updateConfig("envVars", envVars.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-zinc-200">Virtual Computer</span>
          <span className="text-[10px] text-zinc-500">Run terminal commands in an isolated Linux sandbox</span>
        </div>
      </div>

      {/* Language */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Shell / Language</label>
        <div className="grid grid-cols-4 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => updateConfig("language", l.id)}
              className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                language === l.id
                  ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-300"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Commands */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Commands</label>
        <textarea
          value={config.command || ""}
          onChange={(e) => updateConfig("command", e.target.value)}
          placeholder={PLACEHOLDERS[language]}
          rows={8}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-green-300 font-mono focus:outline-none focus:border-emerald-500/40 resize-y leading-relaxed"
          spellCheck={false}
        />
      </div>

      {/* Timeout */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Timeout (seconds)</label>
        <input
          type="number"
          min="1"
          max="300"
          value={config.timeoutSeconds ?? 30}
          onChange={(e) => updateConfig("timeoutSeconds", parseInt(e.target.value))}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500/40"
        />
      </div>

      {/* Environment Variables */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Environment Variables</label>
          <button
            onClick={addEnvVar}
            className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Plus size={10} /> Add
          </button>
        </div>
        {envVars.length > 0 && (
          <div className="flex flex-col gap-2">
            {envVars.map((env, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={env.key}
                  onChange={(e) => updateEnvVar(i, "key", e.target.value)}
                  placeholder="KEY"
                  className="flex-1 bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500/40"
                />
                <input
                  value={env.value}
                  onChange={(e) => updateEnvVar(i, "value", e.target.value)}
                  placeholder="value"
                  className="flex-1 bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500/40"
                />
                <button onClick={() => removeEnvVar(i)} className="text-zinc-600 hover:text-red-400 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        {envVars.length === 0 && (
          <p className="text-[10px] text-zinc-600">No env vars — click Add to inject environment variables into the sandbox.</p>
        )}
      </div>

      {/* Output hint */}
      <div className="p-3 bg-zinc-500/5 border border-zinc-500/10 rounded-lg">
        <p className="text-[10px] text-zinc-500 font-mono">
          Output: <span className="text-zinc-300">stdout</span>, <span className="text-zinc-300">stderr</span>, <span className="text-zinc-300">exitCode</span>, <span className="text-zinc-300">executionTimeMs</span>
        </p>
      </div>
    </div>
  );
}
