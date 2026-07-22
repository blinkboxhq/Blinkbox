import { useState } from "react";
import {
  Bot, Brain, Database, Zap, Plug, Globe, MessageSquare, Eye, Settings2,
  ChevronDown, ChevronRight, ArrowRight, Repeat, Hash, Thermometer,
  ShieldAlert, FileOutput, Sigma, BookOpen, Code2, Save, Search, Fingerprint,
} from "lucide-react";
import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";
import useWorkspaceStore from "@/store/workspaceStore";
import {
  ConfigSection, ConfigHeader, ConfigBadge, ConfigLabel, ConfigPills,
  ConfigToggleRow, ConfigBanner, ConfigDivider,
} from "@/components/ui/ConfigKit";

const VIOLET = "#a78bfa";

const BUILTIN_TOOLS = [
  { icon: Sigma,    label: "Calculator",   desc: "Math & formulas" },
  { icon: BookOpen, label: "Wikipedia",    desc: "Factual lookup" },
  { icon: Globe,    label: "HTTP Request", desc: "Call any API" },
  { icon: Code2,    label: "Run JS",       desc: "Execute scripts" },
  { icon: Save,     label: "Remember",     desc: "Store facts" },
  { icon: Search,   label: "Recall",       desc: "Retrieve facts" },
];

const PROMPT_TEMPLATES = [
  { label: "Research agent", prompt: "Research the following topic thoroughly using web search and Wikipedia. Summarize key findings with sources: {{$json.topic}}" },
  { label: "Data analyst",   prompt: "Analyze the provided data and extract insights. Calculate relevant statistics and return a structured summary: {{$json.data}}" },
  { label: "Email drafter",  prompt: "Draft a professional email based on the following context. Be concise and action-oriented: {{$json.context}}" },
  { label: "Code reviewer",  prompt: "Review the following code for bugs, security issues, and improvements. Return structured feedback: {{$json.code}}" },
];

function slotHandles(slotId) {
  return slotId === "llm" ? new Set(["llm", "chat_model"]) : new Set([slotId]);
}

function getSlotNode(edges, nodes, agentNodeId, slotId) {
  const handles = slotHandles(slotId);
  const edge = edges.find((e) => e.target === agentNodeId && handles.has(e.targetHandle));
  return edge ? nodes.find((n) => n.id === edge.source) || null : null;
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

function SlotRow({ label, icon: Icon, color, connected = [], onGoTo }) {
  const live = connected.length > 0;
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: live ? color : "#525252" }} />
      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-neutral-500 flex-1">{label}</span>
      {live ? (
        <div className="flex flex-wrap gap-1 justify-end">
          {connected.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onGoTo(n.id)}
              className="flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-mono transition-opacity hover:opacity-75 max-w-[140px]"
              style={{ color, backgroundColor: `${color}1a`, borderColor: `${color}4d` }}
            >
              <span className="truncate">{nodeTitle(n)}</span>
              <ArrowRight className="w-2.5 h-2.5 opacity-60 shrink-0" />
            </button>
          ))}
        </div>
      ) : (
        <span className="text-[9px] font-mono text-neutral-700 border border-[#2b2b2b] rounded px-1.5 py-0.5">empty</span>
      )}
    </div>
  );
}

export default function AIAgentNode({ config = {}, updateConfig, nodeId }) {
  const nodes = useWorkspaceStore((s) => s.nodes);
  const edges = useWorkspaceStore((s) => s.edges);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const [advOpen, setAdvOpen] = useState(false);

  const llmNode = getSlotNode(edges, nodes, nodeId, "llm");
  const memoryNode = getSlotNode(edges, nodes, nodeId, "memory");
  const toolNodes = getNodesForSlot(edges, nodes, nodeId, "tools");
  const integrationNodes = getNodesForSlot(edges, nodes, nodeId, "integration");

  const toolCount = toolNodes.length + integrationNodes.length + (config.builtinWebSearch ? 1 : 0);
  const prompt = config.prompt || "";
  const maxIterations = config.maxIterations || 5;
  const temperature = config.temperature ?? 0.3;

  const sliderStyle = (pct) => ({
    background: `linear-gradient(to right, ${VIOLET} 0%, ${VIOLET} ${pct}%, #3b3b3b ${pct}%, #3b3b3b 100%)`,
  });

  return (
    <ConfigSection>
      <ConfigHeader
        icon={Bot}
        iconColor={VIOLET}
        title="AI Agent"
        subtitle="Autonomous reasoning & tool use"
        badge={llmNode ? <ConfigBadge tone="live" label="MODEL LINKED" /> : <ConfigBadge label="NO MODEL" accentColor="#fbbf24" />}
      />

      <div className="bb-glow-border rounded-md bg-[#0f0f0f] border border-[#2b2b2b] divide-y divide-[#1f1f1f]">
        <SlotRow label="Chat Model" icon={Brain} color={VIOLET}
          connected={llmNode ? [llmNode] : []} onGoTo={setSelectedNodeId} />
        <SlotRow label="Memory" icon={Database} color="#c084fc"
          connected={memoryNode ? [memoryNode] : []} onGoTo={setSelectedNodeId} />
        <SlotRow label="Integrations" icon={Plug} color="#34d399"
          connected={integrationNodes} onGoTo={setSelectedNodeId} />
        <SlotRow label="Canvas Tools" icon={Zap} color="#fb923c"
          connected={toolNodes} onGoTo={setSelectedNodeId} />
      </div>

      {!llmNode && (
        <ConfigBanner tone="warn">
          Connect a chat model from the slot row under the agent node on the canvas.
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

      <ConfigDivider label="Built-in Capabilities" />

      <div className="grid grid-cols-3 gap-1.5 -mt-1">
        {BUILTIN_TOOLS.map((t) => (
          <div key={t.label} className="bb-glow-border flex items-center gap-2 px-2.5 py-2 rounded-md bg-[#0f0f0f] border border-[#2b2b2b]">
            <t.icon className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-semibold text-neutral-300 leading-none mb-1 truncate">{t.label}</p>
              <p className="text-[9px] font-mono text-neutral-600 leading-none truncate">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <ConfigToggleRow
        label="Web Search"
        desc="Real-time internet search via Tavily"
        icon={Globe}
        on={!!config.builtinWebSearch}
        onChange={(v) => updateConfig("builtinWebSearch", v)}
        accentColor={VIOLET}
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
        accentColor={VIOLET}
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
            accentColor={VIOLET}
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
            accentColor={VIOLET}
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
            accentColor={VIOLET}
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
            accentColor={VIOLET}
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
            accentColor={VIOLET}
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
