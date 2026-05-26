import CredentialPicker from "@/components/ui/CredentialPicker";
import SmartVariableInput from "@/components/ui/SmartVariableInput";

const OPERATIONS = [
  { id: "generate", label: "Generate" },
  { id: "review",   label: "Review"   },
  { id: "fix",      label: "Fix"      },
  { id: "explain",  label: "Explain"  },
  { id: "refactor", label: "Refactor" },
];

const LANGUAGES = ["JavaScript","TypeScript","Python","Go","Rust","Java","C++","SQL","Bash","Other"];

const CODE_OPS    = ["review", "fix", "explain", "refactor"];
const TASK_OPS    = ["generate", "fix"];

export default function makeCodingAgentNode({ label, accent, credentialType, models, defaultModel, hasBaseUrl }) {
  return function CodingAgentPanel({ config = {}, updateConfig, nodeId, nodes, edges }) {
    const operation = config.operation || "generate";
    const showCode  = CODE_OPS.includes(operation);
    const showTask  = TASK_OPS.includes(operation);

    return (
      <div className="flex flex-col gap-5 w-full">

        {/* Header */}
        <div className={`p-3 rounded-xl bg-${accent}-500/5 border border-${accent}-500/20`}>
          <span className={`text-sm font-bold text-${accent}-400`}>{label}</span>
          <p className="text-[10px] text-zinc-500 mt-0.5">AI coding agent — generate, review, fix, explain, refactor</p>
        </div>

        {/* Operations */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
          <div className="flex gap-1.5 flex-wrap">
            {OPERATIONS.map((op) => (
              <button
                key={op.id}
                onClick={() => updateConfig("operation", op.id)}
                className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                  operation === op.id
                    ? `bg-${accent}-500/10 border-${accent}-400/40 text-${accent}-300`
                    : "bg-[#0a0a0a] border-[#222] text-zinc-500 hover:border-[#333]"
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Language</label>
          <select
            value={config.language || "JavaScript"}
            onChange={(e) => updateConfig("language", e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500/40 appearance-none"
          >
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* Code input — shown for review/fix/explain/refactor */}
        {showCode && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Code</label>
            <SmartVariableInput
              value={config.code || ""}
              onChange={(v) => updateConfig("code", v)}
              placeholder="Paste code here or use {{upstream.code}}"
              multiline
              rows={8}
              nodeId={nodeId}
              nodes={nodes}
              edges={edges}
            />
          </div>
        )}

        {/* Task — shown for generate/fix */}
        {showTask && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {operation === "generate" ? "What to Build" : "Bug Description"}
            </label>
            <SmartVariableInput
              value={config.task || ""}
              onChange={(v) => updateConfig("task", v)}
              placeholder={operation === "generate"
                ? "e.g. A function that validates email addresses"
                : "e.g. The loop off-by-one error on line 12"}
              nodeId={nodeId}
              nodes={nodes}
              edges={edges}
            />
          </div>
        )}

        {/* Model */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Model</label>
          {models ? (
            <select
              value={config.model || defaultModel}
              onChange={(e) => updateConfig("model", e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500/40 appearance-none"
            >
              {models.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          ) : (
            <input
              value={config.model || defaultModel || ""}
              onChange={(e) => updateConfig("model", e.target.value)}
              placeholder="e.g. codellama:7b, deepseek-coder:6.7b"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500/40"
            />
          )}
        </div>

        {/* Base URL — Ollama only */}
        {hasBaseUrl && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Ollama Base URL</label>
            <input
              value={config.baseUrl || "http://localhost:11434"}
              onChange={(e) => updateConfig("baseUrl", e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500/40"
            />
          </div>
        )}

        {/* Credential — hidden for Ollama */}
        {credentialType && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Credential</label>
            <CredentialPicker
              value={config.credentialId || ""}
              onChange={(v) => updateConfig("credentialId", v)}
              type={credentialType}
            />
          </div>
        )}

        {/* Temp + tokens row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Temperature</label>
            <div className="flex items-center gap-2">
              <input
                type="range" min="0" max="1" step="0.05"
                value={config.temperature ?? 0.2}
                onChange={(e) => updateConfig("temperature", parseFloat(e.target.value))}
                className={`flex-1 accent-${accent}-500`}
              />
              <span className="text-[10px] font-mono text-zinc-300 w-8">{(config.temperature ?? 0.2).toFixed(2)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Max Tokens</label>
            <input
              type="number" min="256" max="16000" step="256"
              value={config.maxTokens ?? 4000}
              onChange={(e) => updateConfig("maxTokens", parseInt(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500/40"
            />
          </div>
        </div>

        {/* Output hint */}
        <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] font-mono text-[10px] leading-relaxed">
          <div className="text-zinc-600 mb-1">// output</div>
          <div><span className="text-sky-400">result</span><span className="text-zinc-600">: </span><span className="text-amber-300">string</span><span className="text-zinc-600"> // full response</span></div>
          <div><span className="text-sky-400">code</span><span className="text-zinc-600">:   </span><span className="text-amber-300">string</span><span className="text-zinc-600"> // extracted code block</span></div>
          <div><span className="text-sky-400">model</span><span className="text-zinc-600">:  </span><span className="text-amber-300">string</span></div>
          <div><span className="text-sky-400">tokensUsed</span><span className="text-zinc-600">: </span><span className="text-amber-300">number</span></div>
        </div>
      </div>
    );
  };
}
