import { useState } from "react";
import {
  Brain, Database, Zap, AlertTriangle,
  ChevronDown, ChevronUp, Settings2, Eye, MessageSquare,
  ArrowRight, Globe,
} from "lucide-react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";
import useWorkspaceStore from "../../../../store/workspaceStore";


function getSlotNode(edges, nodes, agentNodeId, slotId) {
  const edge = edges.find(e => e.target === agentNodeId && e.targetHandle === slotId);
  if (!edge) return null;
  return nodes.find(n => n.id === edge.source) || null;
}

function getToolNodes(edges, nodes, agentNodeId) {
  return edges
    .filter(e => e.target === agentNodeId && e.targetHandle === "tools")
    .map(e => nodes.find(n => n.id === e.source))
    .filter(Boolean);
}

function ConnChip({ node, color, icon: Icon, onClick }) {
  const label = node.data?.config?.model || node.data?.config?.memoryType?.replace(/_/g, " ") || node.data?.label || node.data?.backendType;
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all hover:opacity-80"
      style={{ background: color + "10", borderColor: color + "30", color }}>
      <Icon className="w-3 h-3 shrink-0" />
      <span className="text-[10px] font-semibold truncate max-w-[100px]">{label}</span>
      <ArrowRight className="w-2.5 h-2.5 opacity-50 shrink-0" />
    </button>
  );
}

function SlotRow({ label, icon: Icon, color, node, onGoTo }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
        style={{ background: node ? color + "20" : "#27272a", border: `1px solid ${node ? color + "40" : "#3f3f46"}` }}>
        <Icon className="w-3 h-3" style={{ color: node ? color : "#52525b" }} />
      </div>
      <span className="text-[11px] text-zinc-500 flex-1">{label}</span>
      {node ? (
        <ConnChip node={node} color={color} icon={Icon} onClick={onGoTo} />
      ) : (
        <span className="text-[9px] text-zinc-700 border border-zinc-800 rounded px-1.5 py-0.5">not connected</span>
      )}
    </div>
  );
}

export default function AIAgentNode({ config = {}, updateConfig, nodeId }) {
  const nodes = useWorkspaceStore(s => s.nodes);
  const edges = useWorkspaceStore(s => s.edges);
  const setSelectedNodeId = useWorkspaceStore(s => s.setSelectedNodeId);
  const [advOpen, setAdvOpen] = useState(false);

  const llmNode    = getSlotNode(edges, nodes, nodeId, "llm");
  const memoryNode = getSlotNode(edges, nodes, nodeId, "memory");
  const toolNodes  = getToolNodes(edges, nodes, nodeId);

  return (
    <div className="flex flex-col gap-5 w-full">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/70 via-zinc-950 to-zinc-950 pointer-events-none" />
        <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/6 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative flex items-center gap-3 px-4 py-3.5">
          <div className="relative w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
            <Brain className="w-4.5 h-4.5 text-violet-400" strokeWidth={1.5} />
            <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${llmNode ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
          </div>
          <div>
            <p className="text-[13px] font-bold text-zinc-100">AI Agent</p>
            <p className="text-[10px] text-zinc-600">Autonomous reasoning & tool use</p>
          </div>
        </div>
      </div>

      {/* ── Connection status ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Connected via canvas slots</p>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 divide-y divide-zinc-800/40">
          <div className="px-3.5 py-2.5">
            <SlotRow label="Language Model" icon={Brain} color="#a78bfa" node={llmNode} onGoTo={() => setSelectedNodeId?.(llmNode?.id)} />
          </div>
          <div className="px-3.5 py-2.5">
            <SlotRow label="Memory" icon={Database} color="#c084fc" node={memoryNode} onGoTo={() => setSelectedNodeId?.(memoryNode?.id)} />
          </div>
          <div className="px-3.5 py-2.5">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                style={{ background: toolNodes.length ? "#fb923c20" : "#27272a", border: `1px solid ${toolNodes.length ? "#fb923c40" : "#3f3f46"}` }}>
                <Zap className="w-3 h-3" style={{ color: toolNodes.length ? "#fb923c" : "#52525b" }} />
              </div>
              <span className="text-[11px] text-zinc-500 flex-1">Canvas Tools</span>
              {toolNodes.length > 0 ? (
                <div className="flex flex-wrap gap-1 justify-end">
                  {toolNodes.map(t => (
                    <button key={t.id} onClick={() => setSelectedNodeId?.(t.id)}
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:opacity-80 transition-opacity">
                      {t.data?.config?.toolName || t.data?.config?.toolId?.replace(/_/g," ") || "tool"}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-[9px] text-zinc-700 border border-zinc-800 rounded px-1.5 py-0.5">none</span>
              )}
            </div>
          </div>
        </div>

        {!llmNode && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/15">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500/60 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-500/70 leading-relaxed">
              Click the <span className="font-bold text-amber-400/80">LLM</span> slot below the agent node on the canvas to connect a language model.
            </p>
          </div>
        )}
      </div>

      {/* ── Built-in Tools ─────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Built-in Capabilities (always on)</p>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { icon: '🔢', label: 'Calculator',   desc: 'Math & formulas' },
            { icon: '📖', label: 'Wikipedia',    desc: 'Factual lookup' },
            { icon: '🌐', label: 'HTTP Request', desc: 'Call any API' },
            { icon: '⚡', label: 'Run JS',       desc: 'Execute scripts' },
            { icon: '🧠', label: 'Remember',     desc: 'Store facts' },
            { icon: '🔍', label: 'Recall',       desc: 'Retrieve facts' },
          ].map(tool => (
            <div key={tool.label} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/40">
              <span className="text-[13px] shrink-0">{tool.icon}</span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-zinc-300 leading-none mb-0.5">{tool.label}</p>
                <p className="text-[9px] text-zinc-600 leading-none">{tool.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Web Search ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <div className="flex items-center gap-2.5">
            <Globe className="w-3.5 h-3.5 text-sky-500" />
            <div>
              <p className="text-[11px] font-semibold text-zinc-300">Web Search</p>
              <p className="text-[9px] text-zinc-600">Real-time internet search via Tavily</p>
            </div>
          </div>
          <button onClick={() => updateConfig("builtinWebSearch", !config.builtinWebSearch)}
            className={`relative w-9 h-5 rounded-full transition-all duration-200 shrink-0 ${config.builtinWebSearch ? "bg-sky-500" : "bg-zinc-700"}`}>
            <span className={`absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${config.builtinWebSearch ? "translate-x-4" : "translate-x-0"}`} />
          </button>
        </div>
        {config.builtinWebSearch && (
          <div className="px-3.5 pb-3.5 pt-1 border-t border-zinc-800/40">
            <CredentialPicker
              label="Tavily API Key"
              value={config.webSearchCredentialId || ""}
              onChange={(v) => updateConfig("webSearchCredentialId", v)}
              accentColor="sky"
              credentialType="tavily"
              placeholder="Select Tavily credential…"
              hint="Get a free key at tavily.com — required for web search."
            />
          </div>
        )}
      </div>


      {/* ── Mission prompt ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Instructions</label>
          <div className="flex items-center gap-1.5">
            {(config.prompt || "").length > 800 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
            <span className="text-[9px] text-zinc-700">{(config.prompt || "").length} chars</span>
          </div>
        </div>
        <SmartVariableInput
          value={config.prompt || ""}
          onChange={v => updateConfig("prompt", v)}
          placeholder={"What should this agent accomplish? Be specific — include goals, constraints, and expected output format."}
          multiline
          nodeId={nodeId}
        />
        <p className="text-[9px] text-zinc-700 mt-1.5">Use {"{{ variables }}"} to inject data from previous nodes.</p>

        {!(config.prompt) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              { label: 'Research agent', prompt: 'Research the following topic thoroughly using web search and Wikipedia. Summarize key findings with sources: {{$json.topic}}' },
              { label: 'Data analyst', prompt: 'Analyze the provided data and extract insights. Calculate relevant statistics and return a structured summary: {{$json.data}}' },
              { label: 'Email drafter', prompt: 'Draft a professional email based on the following context. Be concise and action-oriented: {{$json.context}}' },
              { label: 'Code reviewer', prompt: 'Review the following code for bugs, security issues, and improvements. Return structured feedback: {{$json.code}}' },
            ].map(t => (
              <button key={t.label} onClick={() => updateConfig("prompt", t.prompt)}
                className="px-2 py-1 rounded-md text-[9px] font-semibold text-zinc-500 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-300 bg-zinc-900/50 transition-all">
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Memory toggle ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-3.5 h-3.5 text-zinc-600" />
            <div>
              <p className="text-[11px] font-semibold text-zinc-300">Conversation Memory</p>
              <p className="text-[9px] text-zinc-600">Remember history between runs</p>
            </div>
          </div>
          <button onClick={() => updateConfig("conversationMemoryEnabled", !config.conversationMemoryEnabled)}
            className={`relative w-9 h-5 rounded-full transition-all duration-200 shrink-0 ${config.conversationMemoryEnabled ? "bg-violet-500" : "bg-zinc-700"}`}>
            <span className={`absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${config.conversationMemoryEnabled ? "translate-x-4" : "translate-x-0"}`} />
          </button>
        </div>
        {config.conversationMemoryEnabled && (
          <div className="px-3.5 pb-3.5 pt-2 border-t border-zinc-800/40 flex flex-col gap-3">
            <div>
              <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5 block">Session ID</label>
              <SmartVariableInput value={config.memorySessionId || ""} onChange={v => updateConfig("memorySessionId", v)} placeholder="{{ $json.chatId }}" nodeId={nodeId} />
            </div>
            <div>
              <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5 block">Window (messages)</label>
              <div className="flex gap-1.5">
                {[10, 20, 50, 100].map(n => (
                  <button key={n} onClick={() => updateConfig("memoryMaxMessages", n)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(config.memoryMaxMessages || 20) === n ? "bg-violet-500/15 border-violet-500/30 text-violet-300" : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Advanced accordion ──────────────────────────────────────────── */}
      <div className="border-t border-zinc-800/40 pt-3">
        <button onClick={() => setAdvOpen(v => !v)} className="flex items-center gap-2 w-full group">
          {advOpen ? <ChevronUp className="w-3 h-3 text-zinc-600" /> : <ChevronDown className="w-3 h-3 text-zinc-600" />}
          <Settings2 className="w-3 h-3 text-zinc-600" />
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest group-hover:text-zinc-400 transition-colors">Advanced</span>
        </button>

        {advOpen && (
          <div className="flex flex-col gap-4 pt-3">

            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">System Prompt</label>
              <SmartVariableInput value={config.systemPrompt || ""} onChange={v => updateConfig("systemPrompt", v)} placeholder="You are a helpful assistant that…" multiline nodeId={nodeId} />
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Output Format</label>
              <div className="flex gap-1.5">
                {["text","json","markdown"].map(f => (
                  <button key={f} onClick={() => updateConfig("outputFormat", f)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(config.outputFormat || "text") === f ? "bg-violet-500/15 border-violet-500/30 text-violet-300" : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700"}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Max Iterations</label>
                <span className="text-[11px] font-bold text-violet-400 font-mono">{config.maxIterations || 5}</span>
              </div>
              <input type="range" min="1" max="20" step="1" value={config.maxIterations || 5} onChange={e => updateConfig("maxIterations", Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-violet-500" />
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-zinc-700">1 (fast)</span><span className="text-[9px] text-zinc-700">20 (thorough)</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Max Tokens</label>
                <span className="text-[11px] font-bold text-violet-400 font-mono">{config.maxTokens || 8192}</span>
              </div>
              <div className="flex gap-1.5">
                {[4096, 8192, 16384, 32768].map(n => (
                  <button key={n} onClick={() => updateConfig("maxTokens", n)}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${(config.maxTokens || 8192) === n ? "bg-violet-500/15 border-violet-500/30 text-violet-300" : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700"}`}>
                    {n >= 1024 ? `${n/1024}k` : n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Temperature</label>
                <span className="text-[11px] font-bold text-violet-400 font-mono">{(config.temperature ?? 0.3).toFixed(1)}</span>
              </div>
              <input type="range" min="0" max="2" step="0.1" value={config.temperature ?? 0.3} onChange={e => updateConfig("temperature", parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-violet-500" />
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-zinc-700">0 precise</span><span className="text-[9px] text-zinc-700">2 creative</span>
              </div>
            </div>

            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-zinc-600" />
                <div>
                  <p className="text-[11px] font-semibold text-zinc-300">Show Reasoning</p>
                  <p className="text-[9px] text-zinc-600">Include step-by-step thought process</p>
                </div>
              </div>
              <button onClick={() => updateConfig("returnIntermediateSteps", !config.returnIntermediateSteps)}
                className={`relative w-9 h-5 rounded-full transition-all duration-200 shrink-0 ${config.returnIntermediateSteps ? "bg-violet-500" : "bg-zinc-700"}`}>
                <span className={`absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${config.returnIntermediateSteps ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">On Error</label>
              <div className="flex gap-1.5">
                {[{id:"throw",label:"Throw"},{id:"return",label:"Return Partial"},{id:"retry",label:"Auto Retry"}].map(o => (
                  <button key={o.id} onClick={() => updateConfig("onError", o.id)}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${(config.onError || "throw") === o.id ? "bg-violet-500/15 border-violet-500/30 text-violet-300" : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700"}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer status ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/40">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${llmNode ? "bg-emerald-500" : "bg-zinc-700"}`} />
        <span className="text-[9px] text-zinc-700 flex-1">
          {llmNode ? `${llmNode.data?.config?.model || llmNode.data?.label || "LLM"} · ${toolNodes.length + platformTools.length + (config.builtinWebSearch ? 1 : 0)} tool${(toolNodes.length + platformTools.length + (config.builtinWebSearch ? 1 : 0)) !== 1 ? "s" : ""}` : "Connect an LLM node to activate"}
        </span>
        {config.maxIterations && <span className="text-[9px] font-mono text-zinc-700">{config.maxIterations} iters</span>}
      </div>
    </div>
  );
}
