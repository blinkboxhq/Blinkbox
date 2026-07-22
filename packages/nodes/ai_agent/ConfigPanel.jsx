import { useState } from "react";
import {
  Bot, Brain, Database, Zap, Plug, Globe, MessageSquare, Eye, Settings2,
  ChevronDown, ChevronRight, ArrowRight, Repeat, Hash, Thermometer,
  ShieldAlert, FileOutput, Fingerprint, Plus,
} from "lucide-react";
import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";
import useWorkspaceStore from "@/store/workspaceStore";
import {
  ConfigSection, ConfigHeader, ConfigBadge, ConfigLabel, ConfigPills,
  ConfigToggleRow, ConfigBanner, ConfigDivider,
} from "@/components/ui/ConfigKit";

// --bb-accent from index.css :root
const ACCENT = "#6f97e8";

const PROMPT_TEMPLATES = [
  { label: "Research agent", prompt: "Research the following topic thoroughly using web search and Wikipedia. Summarize key findings with sources: {{$json.topic}}" },
  { label: "Data analyst",   prompt: "Analyze the provided data and extract insights. Calculate relevant statistics and return a structured summary: {{$json.data}}" },
  { label: "Email drafter",  prompt: "Draft a professional email based on the following context. Be concise and action-oriented: {{$json.context}}" },
  { label: "Code reviewer",  prompt: "Review the following code for bugs, security issues, and improvements. Return structured feedback: {{$json.code}}" },
];

const SLOTS = [
  { id: "llm",         label: "Chat Model",   icon: Brain,    hint: "Required" },
  { id: "memory",      label: "Memory",       icon: Database, hint: "Optional" },
  { id: "integration", label: "Integrations", icon: Plug,     hint: "Apps" },
  { id: "tools",       label: "Tools",        icon: Zap,      hint: "Canvas" },
];

function slotHandles(slotId) {
  return slotId === "llm" ? new Set(["llm", "chat_model"]) : new Set([slotId]);
}

function getNodesForSlot(edges, nodes, agentNodeId, slotId) {
  const handles = slotHandles(slotId);
  return edges
    .filter((e) => e.target === agentNodeId && handles.has(e.targetHandle))
    .map((e) => nodes.find((n) => n.id === e.source))
    .filter(Boolean);
}

function nodeTitle(node) {
  return (
    node.data?.config?.alias ||
    node.data?.config?.model ||
    node.data?.config?.toolName ||
    node.data?.config?.toolId?.replace(/_/g, " ") ||
    node.data?.config?.memoryType?.replace(/_/g, " ") ||
    node.data?.label ||
    node.data?.backendType
  );
}

function SlotRow({ label, icon: Icon, hint, connected = [], onGoTo, onAdd }) {
  const live = connected.length > 0;
  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <span
        className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center border transition-colors"
        style={{
          borderColor: live ? `${ACCENT}59` : "#2b2b2b",
          backgroundColor: live ? `${ACCENT}14` : "transparent",
        }}
      >
        <Icon className="w-3 h-3" style={{ color: live ? ACCENT : "#525252" }} />
      </span>

      <span className="flex-1 min-w-0 pt-0.5">
        <span className="block text-[10px] font-mono uppercase tracking-[0.14em] text-neutral-400">{label}</span>
        {!live && <span className="block text-[9px] font-mono text-neutral-700 mt-0.5">{hint}</span>}
      </span>

      {live ? (
        <span className="flex flex-wrap gap-1 justify-end max-w-[62%]">
          {connected.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onGoTo(n.id)}
              className="flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-mono transition-opacity hover:opacity-75 max-w-[140px]"
              style={{ color: ACCENT, backgroundColor: `${ACCENT}14`, borderColor: `${ACCENT}4d` }}
            >
              <span className="truncate">{nodeTitle(n)}</span>
              <ArrowRight className="w-2.5 h-2.5 opacity-60 shrink-0" />
            </button>
          ))}
        </span>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 px-2 py-1 rounded border border-[#2b2b2b] text-[9px] font-mono text-neutral-600 hover:text-neutral-200 hover:border-[#3b3b3b] transition-colors shrink-0"
        >
          <Plus className="w-2.5 h-2.5" /> Add
        </button>
      )}
    </div>
  );
}

export default function AIAgentNode({ config = {}, updateConfig, nodeId }) {
  const nodes = useWorkspaceStore((s) => s.nodes);
  const edges = useWorkspaceStore((s) => s.edges);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const openAgentPicker = useWorkspaceStore((s) => s.openAgentPicker);
  const [advOpen, setAdvOpen] = useState(false);

  const bySlot = Object.fromEntries(
    SLOTS.map((s) => [s.id, getNodesForSlot(edges, nodes, nodeId, s.id)]),
  );
  const llmNode = bySlot.llm[0] || null;

  const toolCount =
    bySlot.tools.length + bySlot.integration.length + (config.builtinWebSearch ? 1 : 0);
  const prompt = config.prompt || "";
  const maxIterations = config.maxIterations || 5;
  const temperature = config.temperature ?? 0.3;

  const addComponent = () => openAgentPicker?.(nodeId);

  const sliderStyle = (pct) => ({
    background: `linear-gradient(to right, ${ACCENT} 0%, ${ACCENT} ${pct}%, #3b3b3b ${pct}%, #3b3b3b 100%)`,
  });

  return (
    <ConfigSection>
      <ConfigHeader
        icon={Bot}
        iconColor={ACCENT}
        title="AI Agent"
        subtitle="Autonomous reasoning & tool use"
        badge={
          llmNode
            ? <ConfigBadge tone="live" label="MODEL LINKED" />
            : <ConfigBadge label="NO MODEL" accentColor="#fbbf24" />
        }
      />

      <div className="bb-glow-border rounded-md bg-[#0f0f0f] border border-[#2b2b2b] divide-y divide-[#1f1f1f]">
        {SLOTS.map((s) => (
          <SlotRow
            key={s.id}
            label={s.label}
            icon={s.icon}
            hint={s.hint}
            connected={bySlot[s.id]}
            onGoTo={setSelectedNodeId}
            onAdd={addComponent}
          />
        ))}
      </div>

      {!llmNode && (
        <ConfigBanner tone="warn">
          An agent needs a chat model before it can run — add one from the slot row above.
        </ConfigBanner>
      )}

      <div className="flex flex-col">
        <ConfigLabel
          icon={MessageSquare}
          action={<span className="text-[9px] font-mono text-neutral-600 tabular-nums">{prompt.length} chars</span>}
        >
          Instructions
        </ConfigLabel>
        <SmartVariableInput
          value={prompt}
          onChange={(v) => updateConfig("prompt", v)}
          placeholder="What should this agent accomplish? Be specific — include goals, constraints, and expected output format."
          multiline
          nodeId={nodeId}
        />
        {!prompt && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PROMPT_TEMPLATES.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => updateConfig("prompt", t.prompt)}
                className="bb-glow-border px-2.5 py-1.5 rounded-md text-[10px] font-mono text-neutral-500 bg-[#0f0f0f] border border-[#2b2b2b] hover:text-neutral-200 transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <ConfigDivider label="Capabilities" />

      <ConfigToggleRow
        label="Web Search"
        desc="Real-time internet search via Tavily"
        icon={Globe}
        on={!!config.builtinWebSearch}
        onChange={(v) => updateConfig("builtinWebSearch", v)}
        accentColor={ACCENT}
      />
      {config.builtinWebSearch && (
        <CredentialPicker
          label="Tavily API Key"
          value={config.webSearchCredentialId || ""}
          onChange={(v) => updateConfig("webSearchCredentialId", v)}
          credentialType="tavily"
          placeholder="Select Tavily credential…"
          hint="Get a free key at tavily.com — required for web search."
        />
      )}

      <ConfigToggleRow
        label="Conversation Memory"
        desc="Remember history between runs"
        icon={MessageSquare}
        on={!!config.conversationMemoryEnabled}
        onChange={(v) => updateConfig("conversationMemoryEnabled", v)}
        accentColor={ACCENT}
      />
      {config.conversationMemoryEnabled && (
        <>
          <div className="flex flex-col">
            <ConfigLabel icon={Fingerprint}>Session ID</ConfigLabel>
            <SmartVariableInput
              value={config.memorySessionId || ""}
              onChange={(v) => updateConfig("memorySessionId", v)}
              placeholder="{{ $json.chatId }}"
              nodeId={nodeId}
            />
          </div>
          <ConfigPills
            label="Window (messages)"
            icon={Repeat}
            value={config.memoryMaxMessages || 20}
            onChange={(v) => updateConfig("memoryMaxMessages", v)}
            options={[10, 20, 50, 100].map((n) => ({ value: n, label: String(n) }))}
            accentColor={ACCENT}
          />
        </>
      )}

      <button
        type="button"
        onClick={() => setAdvOpen((v) => !v)}
        className="flex items-center gap-2 text-[9px] font-bold text-neutral-500 uppercase tracking-[0.18em] font-mono hover:text-neutral-300 transition-colors"
      >
        {advOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Settings2 className="w-3 h-3" />
        Advanced
      </button>

      {advOpen && (
        <>
          <div className="flex flex-col">
            <ConfigLabel icon={Bot}>System Prompt</ConfigLabel>
            <SmartVariableInput
              value={config.systemPrompt || ""}
              onChange={(v) => updateConfig("systemPrompt", v)}
              placeholder="You are a helpful assistant that…"
              multiline
              nodeId={nodeId}
            />
          </div>

          <ConfigPills
            label="Output Format"
            icon={FileOutput}
            value={config.outputFormat || "text"}
            onChange={(v) => updateConfig("outputFormat", v)}
            options={["text", "json", "markdown"]}
            accentColor={ACCENT}
          />

          <div className="flex flex-col">
            <ConfigLabel
              icon={Repeat}
              action={<span className="text-[9px] font-mono text-neutral-400 tabular-nums">{maxIterations}</span>}
            >
              Max Iterations
            </ConfigLabel>
            <input
              type="range" min={1} max={20} step={1} value={maxIterations}
              onChange={(e) => updateConfig("maxIterations", Number(e.target.value))}
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={sliderStyle(((maxIterations - 1) / 19) * 100)}
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-[9px] font-mono text-neutral-600 tracking-wide">FAST</span>
              <span className="text-[9px] font-mono text-neutral-600 tracking-wide">THOROUGH</span>
            </div>
          </div>

          <ConfigPills
            label="Max Tokens"
            icon={Hash}
            value={config.maxTokens || 8192}
            onChange={(v) => updateConfig("maxTokens", v)}
            options={[4096, 8192, 16384, 32768].map((n) => ({ value: n, label: `${n / 1024}k` }))}
            accentColor={ACCENT}
          />

          <div className="flex flex-col">
            <ConfigLabel
              icon={Thermometer}
              action={<span className="text-[9px] font-mono text-neutral-400 tabular-nums">{temperature.toFixed(1)}</span>}
            >
              Temperature
            </ConfigLabel>
            <input
              type="range" min={0} max={2} step={0.1} value={temperature}
              onChange={(e) => updateConfig("temperature", parseFloat(e.target.value))}
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={sliderStyle((temperature / 2) * 100)}
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-[9px] font-mono text-neutral-600 tracking-wide">PRECISE</span>
              <span className="text-[9px] font-mono text-neutral-600 tracking-wide">CREATIVE</span>
            </div>
          </div>

          <ConfigToggleRow
            label="Show Reasoning"
            desc="Include the step-by-step thought process in the output"
            icon={Eye}
            on={!!config.returnIntermediateSteps}
            onChange={(v) => updateConfig("returnIntermediateSteps", v)}
            accentColor={ACCENT}
          />

          <ConfigPills
            label="On Error"
            icon={ShieldAlert}
            value={config.onError || "throw"}
            onChange={(v) => updateConfig("onError", v)}
            options={[
              { value: "throw", label: "Throw" },
              { value: "return", label: "Return Partial" },
              { value: "retry", label: "Auto Retry" },
            ]}
            accentColor={ACCENT}
          />
        </>
      )}

      <ConfigBanner>
        {llmNode
          ? `${llmNode.data?.config?.model || llmNode.data?.label || "Model"} · ${toolCount} tool${toolCount === 1 ? "" : "s"} · ${maxIterations} iterations`
          : "Connect a chat model to activate this agent"}
      </ConfigBanner>
    </ConfigSection>
  );
}
