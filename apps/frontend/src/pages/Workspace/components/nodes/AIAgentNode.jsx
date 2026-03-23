import { useState } from "react";
import {
  Brain,
  Cpu,
  MessageSquare,
  Settings2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Wrench,
  BookOpen,
  Zap,
} from "lucide-react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

// ── Provider / Model Definitions ─────────────────────────────────────────────
const PROVIDERS = [
  {
    value: "openai",
    label: "OpenAI",
    color: "#10A37F",
    models: [
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "o3-mini", label: "o3-mini" },
    ],
    defaultModel: "gpt-4o-mini",
  },
  {
    value: "anthropic",
    label: "Anthropic",
    color: "#D4C1B3",
    models: [
      { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
      { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
    ],
    defaultModel: "claude-sonnet-4-20250514",
  },
  {
    value: "gemini",
    label: "Google Gemini",
    color: "#4285F4",
    models: [
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    ],
    defaultModel: "gemini-2.0-flash",
  },
  {
    value: "deepseek",
    label: "DeepSeek",
    color: "#22D3EE",
    models: [
      { value: "deepseek-chat", label: "DeepSeek Chat" },
      { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
    ],
    defaultModel: "deepseek-chat",
  },
];

// ── Collapsible Section ──────────────────────────────────────────────────────
function Section({ title, icon: Icon, iconColor, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 py-2 text-left group"
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
        ) : (
          <ChevronRight className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
        )}
        <Icon className="w-3.5 h-3.5" style={{ color: iconColor || "#a78bfa" }} />
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest group-hover:text-zinc-200 transition-colors">
          {title}
        </span>
      </button>
      {open && <div className="flex flex-col gap-4 pb-2 pl-1">{children}</div>}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function AIAgentNode({ config = {}, updateConfig }) {
  const provider = config.provider || "openai";
  const providerDef = PROVIDERS.find((p) => p.value === provider) || PROVIDERS[0];
  const outputFormat = config.outputFormat || "text";
  const enableTools = config.enableTools || false;
  const enableMemory = config.enableMemory || false;

  // When provider changes, reset model to that provider's default
  const handleProviderChange = (newProvider) => {
    const def = PROVIDERS.find((p) => p.value === newProvider);
    updateConfig("provider", newProvider);
    updateConfig("model", def?.defaultModel || "");
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── Animated Header ─────────────────────────────────────────────── */}
      <div className="relative flex items-center gap-3 p-4 rounded-xl overflow-hidden border border-violet-500/20 bg-gradient-to-br from-violet-950/40 via-zinc-900/80 to-indigo-950/40">
        {/* Animated glow orbs */}
        <div className="absolute -top-8 -right-8 w-28 h-28 bg-violet-500/15 rounded-full blur-2xl animate-pulse pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl animate-pulse pointer-events-none" style={{ animationDelay: "1.5s" }} />

        {/* Brain icon with ring */}
        <div className="relative shrink-0 z-10">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Brain className="w-5 h-5 text-violet-400" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-violet-300 animate-pulse" />
        </div>

        {/* Title + inline model selector */}
        <div className="flex flex-col gap-1 z-10 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-violet-300 tracking-wide">
              AI Agent
            </span>
            <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-violet-500/20 text-violet-400 rounded-md border border-violet-500/30">
              Agentic
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 leading-relaxed truncate">
            Autonomous reasoning with tool-calling & memory
          </span>
        </div>
      </div>

      {/* ── Provider & Model ────────────────────────────────────────────── */}
      <Section title="Model Config" icon={Cpu} iconColor={providerDef.color}>
        {/* Provider */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Provider
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                onClick={() => handleProviderChange(p.value)}
                className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all duration-150 ${
                  provider === p.value
                    ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                    : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Model
          </label>
          <select
            value={config.model || providerDef.defaultModel}
            onChange={(e) => updateConfig("model", e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-2.5 text-xs text-violet-300 font-mono outline-none focus:border-violet-500/50 transition-colors cursor-pointer appearance-none"
          >
            {providerDef.models.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Output Format */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Output Format
          </label>
          <div className="flex gap-1.5">
            {[
              { value: "text", label: "Text" },
              { value: "json", label: "JSON" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => updateConfig("outputFormat", f.value)}
                className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all duration-150 ${
                  outputFormat === f.value
                    ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                    : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── System Prompt ───────────────────────────────────────────────── */}
      <Section title="System Prompt" icon={MessageSquare} iconColor="#818cf8">
        <SmartVariableInput
          value={config.systemPrompt || ""}
          onChange={(val) => updateConfig("systemPrompt", val)}
          placeholder="You are a senior data analyst. Extract structured insights from the provided data..."
          multiline
        />
      </Section>

      {/* ── Instructions / User Prompt ──────────────────────────────────── */}
      <Section title="Instructions" icon={BookOpen} iconColor="#c084fc">
        <SmartVariableInput
          value={config.prompt || ""}
          onChange={(val) => updateConfig("prompt", val)}
          placeholder="Analyze the input and return the top 5 key findings..."
          multiline
        />
      </Section>

      {/* ── Tool Calling Toggle ─────────────────────────────────────────── */}
      <Section title="Tool Calling" icon={Wrench} iconColor="#f97316" defaultOpen={enableTools}>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-zinc-300 font-medium">Enable Tools</span>
            <span className="text-[9px] text-zinc-600 leading-relaxed">
              Agent can call connected tool nodes autonomously
            </span>
          </div>
          <button
            onClick={() => updateConfig("enableTools", !enableTools)}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
              enableTools ? "bg-orange-500/80" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                enableTools ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        {enableTools && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Max Tool Rounds
            </label>
            <select
              value={config.maxToolRounds || 3}
              onChange={(e) => updateConfig("maxToolRounds", Number(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-2.5 text-xs text-zinc-300 outline-none focus:border-orange-500/50 transition-colors cursor-pointer appearance-none"
            >
              {[1, 2, 3, 5, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n} round{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
            <p className="text-[9px] text-zinc-600">
              Connect tool nodes to the Tools handle (orange). The agent will loop until satisfied or max rounds.
            </p>
          </div>
        )}
      </Section>

      {/* ── Memory Toggle ───────────────────────────────────────────────── */}
      <Section title="Memory" icon={Zap} iconColor="#a855f7" defaultOpen={enableMemory}>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-zinc-300 font-medium">Enable Memory</span>
            <span className="text-[9px] text-zinc-600 leading-relaxed">
              Inject conversation history from the Memory handle
            </span>
          </div>
          <button
            onClick={() => updateConfig("enableMemory", !enableMemory)}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
              enableMemory ? "bg-purple-500/80" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                enableMemory ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        {enableMemory && (
          <p className="text-[9px] text-zinc-600">
            Connect a memory source to the Memory handle (purple). Messages array will be prepended to the conversation.
          </p>
        )}
      </Section>

      {/* ── Advanced Parameters ──────────────────────────────────────────── */}
      <Section title="Advanced Parameters" icon={Settings2} iconColor="#71717a" defaultOpen={false}>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Temperature
            </label>
            <input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature ?? 0.3}
              onChange={(e) => updateConfig("temperature", parseFloat(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-3 py-2.5 text-xs text-zinc-300 font-mono outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Max Tokens
            </label>
            <input
              type="number"
              min="100"
              max="128000"
              step="100"
              value={config.maxTokens ?? 4000}
              onChange={(e) => updateConfig("maxTokens", parseInt(e.target.value, 10))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-3 py-2.5 text-xs text-zinc-300 font-mono outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Context Injection
          </label>
          <SmartVariableInput
            value={config.parentSource || ""}
            onChange={(val) => updateConfig("parentSource", val)}
            placeholder="{{rag_node.documents}} or {{web_search.results}}"
            multiline
          />
          <p className="text-[9px] text-zinc-600">
            RAG documents or external context injected into the system prompt.
          </p>
        </div>
      </Section>

      {/* ── Credential ──────────────────────────────────────────────────── */}
      <CredentialPicker
        value={config.credentialId || ""}
        onChange={(id) => updateConfig("credentialId", id)}
        accentColor="purple"
        label="API Key"
        placeholder="Select API credential..."
      />

      {/* ── Handle Legend (visual reference) ─────────────────────────────── */}
      <div className="flex flex-col gap-2 p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
          Handle Guide
        </span>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-zinc-500" />
            <span className="text-[9px] text-zinc-500">Input (left)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[9px] text-zinc-500">Output (right)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-[9px] text-zinc-500">Memory (left)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-[9px] text-zinc-500">Tool Call (right)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span className="text-[9px] text-zinc-500">Context (left)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-[9px] text-zinc-500">Tools (left)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
