import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

const OPERATIONS = [
  { id: "navigate", label: "Navigate" },
  { id: "click", label: "Click" },
  { id: "type", label: "Type" },
  { id: "extract", label: "Extract" },
  { id: "screenshot", label: "Screenshot" },
  { id: "script", label: "Run Script" },
  { id: "ai_goal", label: "✨ AI Goal" },
];

const AI_GOAL_OP = "ai_goal";
const NEEDS_URL = ["navigate", "ai_goal"];
const NEEDS_SELECTOR = ["click", "type", "extract"];
const NEEDS_VALUE = ["type"];
const NEEDS_SCRIPT = ["script"];

export default function BrowserAgentNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || "navigate";
  const provider = config.provider || "openai";
  const isAiGoal = operation === AI_GOAL_OP;

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-purple-400">Browser Agent</span>
          <span className="text-[10px] text-zinc-500">AI-driven browser — describe your goal, it navigates autonomously</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-2">
          {OPERATIONS.map((op) => (
            <button
              key={op.id}
              onClick={() => updateConfig("operation", op.id)}
              className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                operation === op.id
                  ? "bg-purple-500/10 border-purple-500/40 text-purple-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              } ${op.id === "ai_goal" ? "col-span-2 bg-purple-500/5" : ""}`}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {(NEEDS_URL.includes(operation) || !NEEDS_SELECTOR.includes(operation)) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">URL</label>
          <SmartVariableInput
            value={config.url || ""}
            onChange={(v) => updateConfig("url", v)}
            placeholder="https://example.com or {{upstream.url}}"
            nodeId={nodeId}
          />
        </div>
      )}

      {isAiGoal && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Goal (plain English)</label>
          <SmartVariableInput
            value={config.goal || ""}
            onChange={(v) => updateConfig("goal", v)}
            placeholder='Find the cheapest product and return its name and price'
            multiline
            nodeId={nodeId}
          />
          <span className="text-[9px] text-zinc-600">The AI will navigate, click, scroll, and extract to achieve this goal</span>
        </div>
      )}

      {NEEDS_SELECTOR.includes(operation) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">CSS Selector</label>
          <SmartVariableInput
            value={config.selector || ""}
            onChange={(v) => updateConfig("selector", v)}
            placeholder='button.submit or #email-input or [data-testid="login"]'
            nodeId={nodeId}
          />
        </div>
      )}

      {NEEDS_VALUE.includes(operation) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Value to Type</label>
          <SmartVariableInput
            value={config.value || ""}
            onChange={(v) => updateConfig("value", v)}
            placeholder="{{upstream.email}} or hello@example.com"
            nodeId={nodeId}
          />
        </div>
      )}

      {NEEDS_SCRIPT.includes(operation) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">JavaScript to Execute</label>
          <SmartVariableInput
            value={config.script || ""}
            onChange={(v) => updateConfig("script", v)}
            placeholder={"return document.title;"}
            multiline
            nodeId={nodeId}
          />
        </div>
      )}

      {isAiGoal && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">API Credential (LLM)</label>
            <input
              value={config.credentialId || ""}
              onChange={(e) => updateConfig("credentialId", e.target.value)}
              placeholder="OpenAI or Anthropic credential ID"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Provider</label>
              <select
                value={provider}
                onChange={(e) => updateConfig("provider", e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/40"
              >
                <option value="openai">OpenAI (GPT-4o)</option>
                <option value="anthropic">Anthropic (Claude)</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Model</label>
              <input
                value={config.model || (provider === "anthropic" ? "claude-3-5-sonnet-20241022" : "gpt-4o-mini")}
                onChange={(e) => updateConfig("model", e.target.value)}
                placeholder={provider === "anthropic" ? "claude-3-5-sonnet-20241022" : "gpt-4o-mini"}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500/40"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Max Steps</label>
            <input
              type="range" min="1" max="15" step="1"
              value={config.maxSteps ?? 10}
              onChange={(e) => updateConfig("maxSteps", parseInt(e.target.value))}
              className="accent-purple-500"
            />
            <span className="text-[9px] text-zinc-600 text-center">{config.maxSteps ?? 10} steps — more = slower but more capable</span>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Wait For Selector (optional)</label>
        <input
          value={config.waitFor || ""}
          onChange={(e) => updateConfig("waitFor", e.target.value)}
          placeholder="#main-content (wait before extracting)"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500/40"
        />
      </div>

      {isAiGoal && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Session ID (optional — share state)</label>
          <SmartVariableInput
            value={config.sessionId || ""}
            onChange={(v) => updateConfig("sessionId", v)}
            placeholder="my-login-session or {{execution.id}}"
            nodeId={nodeId}
          />
          <span className="text-[9px] text-zinc-600">Reuse session context across multiple Browser Agent nodes in the same workflow</span>
        </div>
      )}
    </div>
  );
}
