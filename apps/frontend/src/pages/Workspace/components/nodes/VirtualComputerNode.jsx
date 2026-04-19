import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Zap } from "lucide-react";

const LANGUAGES = [
  {
    id: "bash",
    label: "Bash",
    prompt: "$",
    color: "text-emerald-400",
    activeBg: "bg-emerald-500/10 border-emerald-400/40",
    dot: "bg-emerald-400",
    available: "curl, wget, jq, sed, awk, grep, ffmpeg, git",
  },
  {
    id: "python",
    label: "Python",
    prompt: ">>>",
    color: "text-blue-400",
    activeBg: "bg-blue-500/10 border-blue-400/40",
    dot: "bg-blue-400",
    available: "requests, json, csv, os, sys, re, datetime, math",
  },
  {
    id: "node",
    label: "Node.js",
    prompt: ">",
    color: "text-yellow-400",
    activeBg: "bg-yellow-500/10 border-yellow-400/40",
    dot: "bg-yellow-400",
    available: "fs, path, http, crypto, Buffer, fetch, process",
  },
  {
    id: "powershell",
    label: "PowerShell",
    prompt: "PS>",
    color: "text-sky-400",
    activeBg: "bg-sky-500/10 border-sky-400/40",
    dot: "bg-sky-400",
    available: "Get-Date, Write-Output, Invoke-WebRequest, ConvertTo-Json",
  },
];

const SNIPPETS = {
  bash: [
    { label: "Print env",    code: "env | sort" },
    { label: "List files",   code: "ls -lah /tmp" },
    { label: "Fetch JSON",   code: 'curl -s https://httpbin.org/json | head -20' },
    { label: "System info",  code: "uname -a && cat /etc/os-release" },
  ],
  python: [
    { label: "JSON parse",   code: 'import json, sys\ndata = json.loads(\'{"key":"value"}\')\nprint(json.dumps(data, indent=2))' },
    { label: "HTTP request", code: 'import urllib.request, json\nwith urllib.request.urlopen("https://httpbin.org/json") as r:\n    print(json.loads(r.read()))' },
    { label: "Date/time",    code: 'from datetime import datetime\nprint(datetime.now().isoformat())' },
    { label: "List files",   code: 'import os\nfor f in os.listdir("/tmp"):\n    print(f)' },
  ],
  node: [
    { label: "JSON output",  code: 'const result = { message: "hello", ts: Date.now() };\nconsole.log(JSON.stringify(result, null, 2));' },
    { label: "Read env",     code: 'console.log(JSON.stringify(process.env, null, 2));' },
    { label: "Fetch URL",    code: 'const r = await fetch("https://httpbin.org/json");\nconst d = await r.json();\nconsole.log(JSON.stringify(d, null, 2));' },
    { label: "Crypto hash",  code: 'const crypto = require("crypto");\nconst h = crypto.createHash("sha256").update("hello").digest("hex");\nconsole.log(h);' },
  ],
  powershell: [
    { label: "Date/time",    code: 'Get-Date -Format "yyyy-MM-ddTHH:mm:ss"' },
    { label: "Env vars",     code: 'Get-ChildItem Env: | Sort-Object Name | Format-Table -AutoSize' },
    { label: "System info",  code: '$PSVersionTable | ConvertTo-Json' },
    { label: "HTTP request", code: '$r = Invoke-WebRequest "https://httpbin.org/json"\n$r.Content' },
  ],
};

export default function VirtualComputerNode({ config = {}, updateConfig }) {
  const language   = config.language || "bash";
  const envVars    = config.envVars  || [];
  const [showSnippets, setShowSnippets] = useState(false);
  const [showEnv,      setShowEnv]      = useState(envVars.length > 0);

  const lang = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];

  function addEnvVar() {
    setShowEnv(true);
    updateConfig("envVars", [...envVars, { key: "", value: "" }]);
  }
  function updateEnvVar(i, field, val) {
    updateConfig("envVars", envVars.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  }
  function removeEnvVar(i) {
    updateConfig("envVars", envVars.filter((_, idx) => idx !== i));
  }
  function insertSnippet(code) {
    const current = config.command || "";
    updateConfig("command", current ? current + "\n\n" + code : code);
    setShowSnippets(false);
  }

  return (
    <div className="flex flex-col gap-4 w-full">

      {/* Terminal window chrome */}
      <div className="rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#0d0d0d]">

        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#141414] border-b border-[#1e1e1e]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">blinkbox — sandbox</span>
          <div className={`w-2 h-2 rounded-full ${lang.dot}`} />
        </div>

        {/* Language tabs */}
        <div className="flex border-b border-[#1e1e1e]">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => updateConfig("language", l.id)}
              className={`flex-1 py-2 text-[10px] font-bold transition-all border-b-2 ${
                language === l.id
                  ? `${l.color} border-current bg-[#111]`
                  : "text-zinc-600 border-transparent hover:text-zinc-400"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="relative">
          {/* Prompt indicator */}
          <div className={`absolute left-3 top-3 text-[10px] font-mono ${lang.color} opacity-50 select-none pointer-events-none`}>
            {lang.prompt}
          </div>
          <textarea
            value={config.command || ""}
            onChange={(e) => updateConfig("command", e.target.value)}
            placeholder={`# ${lang.label} commands run in an isolated Alpine Linux sandbox\n# No network access · 256 MB RAM · 0.5 CPU · PID limit 50`}
            rows={10}
            spellCheck={false}
            className={`w-full bg-transparent pl-10 pr-3 py-3 text-xs font-mono focus:outline-none resize-y leading-relaxed placeholder:text-zinc-700 ${lang.color}`}
          />
        </div>

        {/* Available tools bar */}
        <div className="px-4 py-2 border-t border-[#1e1e1e] bg-[#0a0a0a]">
          <p className="text-[9px] text-zinc-600 font-mono">
            <span className="text-zinc-500">available:</span> {lang.available}
          </p>
        </div>
      </div>

      {/* Snippets */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setShowSnippets(!showSnippets)}
          className="flex items-center justify-between text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Zap size={10} />
            <span className="font-bold uppercase tracking-widest">Quick Snippets</span>
          </div>
          {showSnippets ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
        {showSnippets && (
          <div className="grid grid-cols-2 gap-2">
            {(SNIPPETS[language] || []).map((s) => (
              <button
                key={s.label}
                onClick={() => insertSnippet(s.code)}
                className="text-left px-3 py-2 bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg hover:border-[#333] transition-all"
              >
                <span className="text-[10px] text-zinc-300 font-medium">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Timeout */}
      <div className="flex items-center gap-3">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">Timeout</label>
        <input
          type="range"
          min="5"
          max="300"
          step="5"
          value={config.timeoutSeconds ?? 30}
          onChange={(e) => updateConfig("timeoutSeconds", parseInt(e.target.value))}
          className="flex-1 accent-emerald-500"
        />
        <span className="text-[10px] font-mono text-zinc-300 w-10 text-right">{config.timeoutSeconds ?? 30}s</span>
      </div>

      {/* Env vars */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setShowEnv(!showEnv)}
          className="flex items-center justify-between text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <span className="font-bold uppercase tracking-widest">Env Variables {envVars.length > 0 && `(${envVars.length})`}</span>
          <div className="flex items-center gap-2">
            <span
              onClick={(e) => { e.stopPropagation(); addEnvVar(); }}
              className="flex items-center gap-1 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <Plus size={10} /> Add
            </span>
            {showEnv ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </div>
        </button>
        {showEnv && envVars.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {envVars.map((env, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={env.key}
                  onChange={(e) => updateEnvVar(i, "key", e.target.value)}
                  placeholder="KEY"
                  className="w-28 bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-zinc-500/40"
                />
                <span className="text-zinc-600 text-xs font-mono">=</span>
                <input
                  value={env.value}
                  onChange={(e) => updateEnvVar(i, "value", e.target.value)}
                  placeholder="value"
                  className="flex-1 bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-500/40"
                />
                <button onClick={() => removeEnvVar(i)} className="text-zinc-700 hover:text-red-400 transition-colors">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Output schema */}
      <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] font-mono text-[10px] leading-relaxed">
        <div className="text-zinc-600 mb-1">// output</div>
        <div><span className="text-sky-400">stdout</span><span className="text-zinc-600">: </span><span className="text-amber-300">string</span></div>
        <div><span className="text-sky-400">stderr</span><span className="text-zinc-600">: </span><span className="text-amber-300">string</span></div>
        <div><span className="text-sky-400">exitCode</span><span className="text-zinc-600">: </span><span className="text-amber-300">number</span></div>
        <div><span className="text-sky-400">executionTimeMs</span><span className="text-zinc-600">: </span><span className="text-amber-300">number</span></div>
        <div><span className="text-sky-400">timedOut</span><span className="text-zinc-600">: </span><span className="text-amber-300">boolean</span></div>
      </div>
    </div>
  );
}
