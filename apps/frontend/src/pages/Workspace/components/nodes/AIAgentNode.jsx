import { useState } from "react";
import {
  Brain,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Settings2,
  Sparkles,
  Cpu,
  Wrench,
  BookOpen,
  ListTree,
} from "lucide-react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

// ═════════════════════════════════════════════════════════════════════════════
// AGENT TYPE DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════════
// Each agent type defines a reasoning strategy. The backend's agentic loop
// adapts its system prompt and tool-handling behavior based on this selection.

const AGENT_TYPES = [
  {
    value: "tools_agent",
    label: "Tools Agent",
    description: "Uses native function-calling to invoke tools. Best for structured tasks.",
    icon: Wrench,
    color: "#f97316",
  },
  {
    value: "conversational",
    label: "Conversational Agent",
    description: "Chat-optimized with memory. Ideal for multi-turn dialogue flows.",
    icon: MessageSquare,
    color: "#818cf8",
  },
  {
    value: "react",
    label: "ReAct Agent",
    description: "Reason + Act loop. Thinks step-by-step before each tool call.",
    icon: Brain,
    color: "#a855f7",
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// PROVIDER / MODEL CATALOG
// ═════════════════════════════════════════════════════════════════════════════

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
  {
    value: "openrouter",
    label: "OpenRouter",
    color: "#3b82f6",
    models: [
      { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
      { value: "google/gemini-pro-1.5", label: "Gemini Pro 1.5" },
      { value: "liquid/lfm-40b", label: "LFM 40B" },
    ],
    defaultModel: "anthropic/claude-3.5-sonnet",
  },
  {
    value: "together",
    label: "Together AI",
    color: "#0ea5e9",
    models: [
      { value: "meta-llama/Llama-3-70b-chat-hf", label: "Llama 3 70B" },
      { value: "mistralai/Mixtral-8x7B-Instruct-v0.1", label: "Mixtral 8x7B" },
    ],
    defaultModel: "meta-llama/Llama-3-70b-chat-hf",
  },
  {
    value: "perplexity",
    label: "Perplexity",
    color: "#22d3ee",
    models: [
      { value: "llama-3-sonar-large-32k-online", label: "Sonar Large 32K" },
      { value: "llama-3-sonar-small-32k-chat", label: "Sonar Small 32K" },
    ],
    defaultModel: "llama-3-sonar-large-32k-online",
  },
  {
    value: "xai",
    label: "xAI (Grok)",
    color: "#ffffff",
    models: [
      { value: "grok-beta", label: "Grok Beta" },
      { value: "grok-2", label: "Grok 2" },
    ],
    defaultModel: "grok-beta",
  },
  {
    value: "fireworks",
    label: "Fireworks AI",
    color: "#f43f5e",
    models: [
      { value: "accounts/fireworks/models/firefunction-v2", label: "FireFunction v2" },
      { value: "accounts/fireworks/models/llama-v3-70b-instruct", label: "Llama 3 70B" },
    ],
    defaultModel: "accounts/fireworks/models/firefunction-v2",
  },
  {
    value: "cerebras",
    label: "Cerebras",
    color: "#f97316",
    models: [
      { value: "llama3.1-70b", label: "Llama 3.1 70B" },
      { value: "llama3.1-8b", label: "Llama 3.1 8B" },
    ],
    defaultModel: "llama3.1-70b",
  },
  {
    value: "ollama",
    label: "Ollama (Local)",
    color: "#94a3b8",
    models: [
      { value: "llama3", label: "Llama 3" },
      { value: "mistral", label: "Mistral" },
      { value: "gemma", label: "Gemma" },
    ],
    defaultModel: "llama3",
  },
  {
    value: "novita",
    label: "Novita AI",
    color: "#8b5cf6",
    models: [
      { value: "meta-llama/llama-3-70b-instruct", label: "Llama 3 70B" },
    ],
    defaultModel: "meta-llama/llama-3-70b-instruct",
  },
  {
    value: "deepinfra",
    label: "DeepInfra",
    color: "#10b981",
    models: [
      { value: "meta-llama/Meta-Llama-3-70B-Instruct", label: "Llama 3 70B" },
    ],
    defaultModel: "meta-llama/Meta-Llama-3-70B-Instruct",
  },
  {
    value: "hyperbolic",
    label: "Hyperbolic",
    color: "#fbbf24",
    models: [
      { value: "meta-llama/Meta-Llama-3-70B-Instruct", label: "Llama 3 70B" },
    ],
    defaultModel: "meta-llama/Meta-Llama-3-70B-Instruct",
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// COLLAPSIBLE SECTION
// ═════════════════════════════════════════════════════════════════════════════

function Section({ title, icon: Icon, iconColor, defaultOpen = true, badge, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col border border-zinc-800/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2.5 bg-zinc-900/50 text-left group hover:bg-zinc-800/30 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        ) : (
          <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        )}
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: iconColor || "#a78bfa" }} />
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest group-hover:text-zinc-200 transition-colors flex-1">
          {title}
        </span>
        {badge}
      </button>
      {open && (
        <div className="flex flex-col gap-4 px-3 py-3 bg-zinc-950/30">
          {children}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DEPENDENCY SLOT — Visual indicator for handle connections (n8n-style)
// ═════════════════════════════════════════════════════════════════════════════

function DependencySlot({ label, color, description, required, connected }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-150 ${
      connected
        ? "border-emerald-500/20 bg-emerald-500/5"
        : required
          ? "border-amber-500/20 bg-amber-500/5"
          : "border-zinc-800/50 bg-zinc-900/30"
    }`}>
      {/* Color-coded dot matching the handle */}
      <div className="shrink-0 relative">
        <div
          className="w-3 h-3 rounded-full border-2 border-zinc-900"
          style={{ backgroundColor: color }}
        />
        {connected && (
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-zinc-900" />
        )}
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-zinc-300">{label}</span>
          {required && !connected && (
            <span className="text-[8px] font-bold text-amber-500/80 uppercase">required</span>
          )}
        </div>
        <span className="text-[9px] text-zinc-600 leading-tight">{description}</span>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT — n8n-Style AI Agent Configuration Panel
// ═════════════════════════════════════════════════════════════════════════════

export default function AIAgentNode({ config = {}, updateConfig }) {
  const agentType = config.agentType || "tools_agent";
  const provider = config.provider || "openai";
  const providerDef = PROVIDERS.find((p) => p.value === provider) || PROVIDERS[0];
  const outputFormat = config.outputFormat || "text";

  // When provider changes, reset model to that provider's default
  const handleProviderChange = (newProvider) => {
    const def = PROVIDERS.find((p) => p.value === newProvider);
    updateConfig("provider", newProvider);
    updateConfig("model", def?.defaultModel || "");
  };

  return (
    <div className="flex flex-col gap-3 w-full">

      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <div className="relative flex items-center gap-3 p-4 rounded-xl overflow-hidden border border-violet-500/20 bg-gradient-to-br from-violet-950/40 via-zinc-900/80 to-indigo-950/40">
        <div className="absolute -top-8 -right-8 w-28 h-28 bg-violet-500/15 rounded-full blur-2xl animate-pulse pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl animate-pulse pointer-events-none" style={{ animationDelay: "1.5s" }} />

        <div className="relative shrink-0 z-10">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Brain className="w-5 h-5 text-violet-400" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-violet-300 animate-pulse" />
        </div>

        <div className="flex flex-col gap-0.5 z-10 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-violet-300 tracking-wide">AI Agent</span>
            <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-violet-500/20 text-violet-400 rounded-md border border-violet-500/30">
              {AGENT_TYPES.find((t) => t.value === agentType)?.label || "Agent"}
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 leading-relaxed truncate">
            Autonomous reasoning with tool-calling & memory
          </span>
        </div>
      </div>

      {/* ─── AGENT TYPE SELECTOR ────────────────────────────────────────── */}
      <Section title="Agent Type" icon={Brain} iconColor="#a855f7">
        <div className="flex flex-col gap-1.5">
          {AGENT_TYPES.map((type) => {
            const TypeIcon = type.icon;
            const isSelected = agentType === type.value;
            return (
              <button
                key={type.value}
                onClick={() => updateConfig("agentType", type.value)}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all duration-150 ${
                  isSelected
                    ? "border-violet-500/30 bg-violet-500/8"
                    : "border-zinc-800/50 bg-zinc-900/20 hover:border-zinc-700/50 hover:bg-zinc-800/20"
                }`}
              >
                <TypeIcon
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: isSelected ? type.color : "#52525b" }}
                />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className={`text-[11px] font-bold ${isSelected ? "text-violet-300" : "text-zinc-400"}`}>
                    {type.label}
                  </span>
                  <span className="text-[9px] text-zinc-600 leading-relaxed">
                    {type.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ─── DEPENDENCY SLOTS (n8n-style visual routing) ────────────────── */}
      <Section title="Dependencies" icon={ListTree} iconColor="#14b8a6">
        <div className="flex flex-col gap-2">
          <DependencySlot
            label="Chat Model"
            color="#6366f1"
            description="Connect an LLM node (OpenAI, Anthropic, etc.) — or configure below"
            required
            connected={!!config.credentialId}
          />
          <DependencySlot
            label="Memory"
            color="#a855f7"
            description="Connect a memory buffer for multi-turn conversation context"
            required={agentType === "conversational"}
            connected={false}
          />
          <DependencySlot
            label="Tools"
            color="#f97316"
            description="Connect tool/action nodes the agent can invoke autonomously"
            required={agentType === "tools_agent"}
            connected={false}
          />
        </div>
        <p className="text-[9px] text-zinc-600 leading-relaxed">
          Connect nodes to the colored handles on the left side of this node. Each handle accepts a specific dependency type.
        </p>
      </Section>

      {/* ─── CHAT MODEL CONFIG ──────────────────────────────────────────── */}
      <Section
        title="Chat Model"
        icon={Cpu}
        iconColor={providerDef.color}
        badge={
          <span className="text-[9px] text-zinc-600 font-mono">
            {config.model || providerDef.defaultModel}
          </span>
        }
      >
        {/* Provider grid */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Provider
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                onClick={() => handleProviderChange(p.value)}
                className={`px-2 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all duration-150 ${
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

        {/* Model dropdown */}
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

        {/* Credential */}
        <CredentialPicker
          value={config.credentialId || ""}
          onChange={(id) => updateConfig("credentialId", id)}
          accentColor="purple"
          label="API Key"
          placeholder="Select API credential..."
        />
      </Section>

      {/* ─── SYSTEM PROMPT / PERSONA ────────────────────────────────────── */}
      <Section title="System Prompt" icon={MessageSquare} iconColor="#818cf8">
        <SmartVariableInput
          value={config.systemPrompt || ""}
          onChange={(val) => updateConfig("systemPrompt", val)}
          placeholder="You are a senior data analyst. Extract structured insights from the provided data and format them clearly..."
          multiline
        />
        <p className="text-[9px] text-zinc-600">
          Defines the agent's persona, role, and behavioral constraints. This becomes the system-level instruction.
        </p>
      </Section>

      {/* ─── USER PROMPT / INSTRUCTIONS ─────────────────────────────────── */}
      <Section title="Instructions" icon={BookOpen} iconColor="#c084fc">
        <SmartVariableInput
          value={config.prompt || ""}
          onChange={(val) => updateConfig("prompt", val)}
          placeholder="Analyze the input data and return the top 5 key findings..."
          multiline
        />
      </Section>

      {/* ─── ADVANCED SETTINGS ──────────────────────────────────────────── */}
      <Section title="Advanced" icon={Settings2} iconColor="#71717a" defaultOpen={false}>
        {/* Output format */}
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

        {/* Max Iterations + Temperature row */}
        <div className="flex gap-3">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Max Iterations
            </label>
            <select
              value={config.maxIterations || 5}
              onChange={(e) => updateConfig("maxIterations", Number(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-3 py-2.5 text-xs text-zinc-300 outline-none focus:border-violet-500/50 transition-colors cursor-pointer appearance-none"
            >
              {[1, 2, 3, 5, 8, 10, 15].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
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
        </div>

        {/* Max Tokens */}
        <div className="flex flex-col gap-1.5">
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

        {/* Return intermediate steps toggle */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-zinc-300 font-medium">Return Intermediate Steps</span>
            <span className="text-[9px] text-zinc-600 leading-relaxed">
              Include the agent's thought process and tool calls in output
            </span>
          </div>
          <button
            onClick={() => updateConfig("returnIntermediateSteps", !config.returnIntermediateSteps)}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
              config.returnIntermediateSteps ? "bg-violet-500/80" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                config.returnIntermediateSteps ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </Section>

      {/* ─── HANDLE LEGEND ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 p-3 bg-zinc-900/50 border border-zinc-800/40 rounded-xl">
        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
          Handles
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
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[9px] text-zinc-500">Steps (right)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-[9px] text-zinc-500">Tools (left)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
