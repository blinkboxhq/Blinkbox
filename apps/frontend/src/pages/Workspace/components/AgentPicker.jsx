import { useState, useCallback, useEffect, useRef } from "react";
import { Brain, Database, Wrench, ArrowLeft, X, Search,
  Bot, Plug, Sparkles, CheckCircle2, Plus, ChevronRight, Layers } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NodeRegistry } from "../nodeRegistry";

const AGENT_TOOLS = [
  "tool_http_request",
  "tool_scraper",
  "tool_webhook",
  "tool_mcp_client",
  "tool_call_workflow",
  "tool_think",
  "tool_sql",
  "tool_mongodb",
];

const AGENT_CATEGORIES = [
  { id: "chat_model",   label: "Chat Model",   icon: Brain,   slotId: "llm",         nodes: ["agent_openai","agent_anthropic","agent_gemini","agent_perplexity","agent_xai","agent_deepseek","agent_moonshot","agent_nvidia_nim", "agent_openrouter", "agent_zai", "agent_minimax", "agent_sakana"] },
  { id: "memory",       label: "Memory",       icon: Database,slotId: "memory",       nodes: ["agent_memory","agent_memory_window"] },
  { id: "tools",        label: "Tools",        icon: Wrench,  slotId: "tools",        nodes: AGENT_TOOLS },
  { id: "integration",  label: "Integration",  icon: Plug,    slotId: "integration",  nodes: ["slack","gmail","discord","telegram","notion","airtable","google_sheets","google_calendar","google_drive","outlook","github","linear","hubspot","jira","asana","stripe","shopify","clickup","twilio","mongodb","postgres","redis_node","azure_devops","calendly","datadog","elevenlabs","firebase","instagram","intercom","linkedin","mailchimp","monday","netlify","onedrive","pagerduty","pinecone","pipedrive","reddit","resend","s3","sendgrid","sentry","sftp","sharepoint","supabase","teams","tiktok","trello","typeform","vercel","web_search","whatsapp","woocommerce","youtube","zendesk","zoom"] },
  { id: "skills",       label: "Skills",       icon: Sparkles,slotId: "skills",       nodes: ["agent_skill"] },
];

const CAT_DESC = {
  chat_model:  "The brain that reasons",
  memory:      "Recall across runs",
  tools:       "Actions the agent can call",
  integration: "Apps the agent can act in",
  skills:      "Reusable instruction packs",
};

const CAT_COLORS = {
  chat_model:  "#6f97e8",
  memory:      "#a9c0ef",
  tools:       "#7dd3fc",
  integration: "#6ee7b7",
  skills:      "#c4b5fd",
};

const SLOT_OFFSETS = {
  llm:         { x: -30,  y: 160 },
  memory:      { x: 30,   y: 160 },
  integration: { x: 90,   y: 160 },
  tools:       { x: 150,  y: 160 },
  skills:      { x: 210,  y: 160 },
};

export default function AgentPicker() {
  const [page, setPage]       = useState("home");
  const [search, setSearch]   = useState("");
  const [selected, setSelected] = useState([]);
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRef = useRef(null);

  const agentPickerParentId = useWorkspaceStore(s => s.agentPickerParentId);
  const closeAgentPicker    = useWorkspaceStore(s => s.closeAgentPicker);
  const addNode             = useWorkspaceStore(s => s.addNode);
  const onConnect           = useWorkspaceStore(s => s.onConnect);
  const { getNode }         = useReactFlow();

  useEffect(() => { inputRef.current?.focus(); }, [page]);

  const close = useCallback(() => {
    closeAgentPicker();
    setPage("home");
    setSearch("");
    setSelected([]);
  }, [closeAgentPicker]);

  const toggleSelect = useCallback((nodeKey, slotId) => {
    setSelected(prev => {
      const idx = prev.findIndex(s => s.nodeKey === nodeKey);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      return [...prev, { nodeKey, slotId }];
    });
  }, []);

  const commitSingle = useCallback((nodeKey, slotId) => {
    const parentNode = getNode(agentPickerParentId);
    const off = SLOT_OFFSETS[slotId] || { x: 60, y: 220 };
    const newId = `${nodeKey}-${crypto.randomUUID()}`;
    const nodeDef = NodeRegistry[nodeKey];
    addNode({
      id: newId, type: "custom",
      position: parentNode
        ? { x: parentNode.position.x + off.x, y: parentNode.position.y + off.y }
        : { x: 400, y: 300 },
      data: { backendType: nodeKey, label: nodeDef?.label || nodeKey, type: "action", config: {}, isAgentComponent: true },
    });
    onConnect({ source: newId, sourceHandle: "agent_out", target: agentPickerParentId, targetHandle: slotId });
    close();
  }, [agentPickerParentId, addNode, onConnect, getNode, close]);

  const commitAll = useCallback(() => {
    if (selected.length === 0) return;
    const parentNode = getNode(agentPickerParentId);
    selected.forEach(({ nodeKey, slotId }, i) => {
      const off = SLOT_OFFSETS[slotId] || { x: 60, y: 220 };
      const newId = `${nodeKey}-${crypto.randomUUID()}`;
      const nodeDef = NodeRegistry[nodeKey];
      addNode({
        id: newId, type: "custom",
        position: parentNode
          ? { x: parentNode.position.x + off.x + i * 30, y: parentNode.position.y + off.y + i * 30 }
          : { x: 400 + i * 200, y: 300 },
        data: { backendType: nodeKey, label: nodeDef?.label || nodeKey, type: "action", config: {}, isAgentComponent: true },
      });
      onConnect({ source: newId, sourceHandle: "agent_out", target: agentPickerParentId, targetHandle: slotId });
    });
    close();
  }, [selected, agentPickerParentId, addNode, onConnect, getNode, close]);

  // Derive current node list for the current page
  const currentCat    = AGENT_CATEGORIES.find(c => c.id === page);
  const currentSlotId = currentCat?.slotId || "tools";

  const currentNodes = currentCat?.nodes
    ? currentCat.nodes.map(k => ({ key: k, ...NodeRegistry[k] })).filter(n => n.label)
    : [];

  const query = search.trim().toLowerCase();
  const visibleNodes = query
    ? currentNodes.filter(n => n.label?.toLowerCase().includes(query) || n.key.toLowerCase().includes(query))
    : currentNodes;

  useEffect(() => { setFocusIdx(0); }, [search, page]);

  const isListPage = page !== "home" && currentNodes.length > 0;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (page !== "home") { setPage("home"); setSearch(""); return; }
        if (search) { setSearch(""); return; }
        close();
        return;
      }
      if (!isListPage) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, visibleNodes.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && visibleNodes[focusIdx]) {
        if (selected.length > 0) toggleSelect(visibleNodes[focusIdx].key, currentSlotId);
        else commitSingle(visibleNodes[focusIdx].key, currentSlotId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, isListPage, visibleNodes, focusIdx, selected, currentSlotId, page, search, commitSingle, toggleSelect]);

  const totalCount = AGENT_CATEGORIES.reduce(
    (a, c) => a + c.nodes.filter(k => NodeRegistry[k]).length,
    0,
  );

  const title = currentCat ? currentCat.label : "Add to Agent";
  const subtitle = currentCat ? CAT_DESC[currentCat.id] : "Everything an agent can plug into";

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={close} />
      <div
        className="bb-liquid bb-edge-left fixed top-0 right-0 bottom-0 z-50 flex flex-col"
        style={{ width: "clamp(360px, 32vw, 480px)" }}
      >
        <div className="shrink-0 px-5 pt-5 pb-3 flex items-start gap-3">
          {page !== "home" && (
            <button
              onClick={() => { setPage("home"); setSearch(""); }}
              className="w-7 h-7 -ml-1 mt-0.5 shrink-0 flex items-center justify-center rounded-lg text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <ArrowLeft size={15} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-semibold text-white leading-tight truncate">{title}</h2>
            <p className="text-[12px] text-neutral-500 mt-1 leading-snug">{subtitle}</p>
          </div>
          <button
            onClick={close}
            className="w-7 h-7 shrink-0 mt-0.5 flex items-center justify-center rounded-lg text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {isListPage && (
          <div className="shrink-0 px-5 pb-3">
            <div className="bb-input bb-glow-border flex items-center gap-2.5 px-3.5 h-11 rounded-xl focus-within:border-white/[0.22] transition-all">
              <Search size={15} className="text-neutral-600 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${title.toLowerCase()}…`}
                className="flex-1 bg-transparent text-[14px] text-white font-medium outline-none placeholder:text-neutral-600"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-neutral-600 hover:text-white transition-colors shrink-0">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        <div
          className="flex-1 overflow-y-auto px-3 pb-2 flex flex-col gap-0.5"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#222 transparent" }}
        >
          {page === "home" && AGENT_CATEGORIES.map(cat => {
            const CatIcon = cat.icon;
            const count = cat.nodes.filter(k => NodeRegistry[k]).length;
            return (
              <button
                key={cat.id}
                onClick={() => setPage(cat.id)}
                className="bb-nav-item flex items-center gap-3.5 w-full px-3.5 py-3.5 rounded-xl text-left group"
              >
                <CatIcon
                  size={24}
                  strokeWidth={1.7}
                  className="shrink-0"
                  style={{ color: CAT_COLORS[cat.id] || "#a3a3a3" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-white leading-tight">{cat.label}</div>
                  <div className="text-[12px] text-neutral-500 mt-0.5 truncate">
                    {CAT_DESC[cat.id]} ·{" "}
                    <span style={{ color: CAT_COLORS[cat.id] || "#a3a3a3" }}>{count}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-neutral-700 shrink-0 group-hover:text-neutral-400 transition-colors" />
              </button>
            );
          })}

          {isListPage && (
            visibleNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Search size={28} className="text-neutral-700" />
                <p className="text-[13px] text-neutral-500">No results for "{search}"</p>
              </div>
            ) : (
              visibleNodes.map((n, i) => (
                <AgentNodeRow
                  key={n.key}
                  nodeDef={n}
                  focused={i === focusIdx}
                  onHover={() => setFocusIdx(i)}
                  onSelect={() => {
                    if (selected.length > 0) toggleSelect(n.key, currentSlotId);
                    else commitSingle(n.key, currentSlotId);
                  }}
                  onToggle={() => toggleSelect(n.key, currentSlotId)}
                  selected={selected.some(s => s.nodeKey === n.key)}
                />
              ))
            )
          )}
        </div>

        {selected.length > 0 ? (
          <div className="shrink-0 px-5 py-3.5 border-t border-white/[0.06] flex items-center gap-3">
            <button
              onClick={() => setSelected([])}
              className="p-1.5 text-neutral-600 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors shrink-0"
            >
              <X size={13} />
            </button>
            <span className="text-[12px] text-neutral-500 flex-1">{selected.length} selected</span>
            <button
              onClick={commitAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-black text-[12px] font-bold hover:bg-neutral-200 transition-colors"
            >
              <Plus size={13} /> Add {selected.length}
            </button>
          </div>
        ) : (
          <div className="shrink-0 px-5 py-3.5 border-t border-white/[0.06] flex items-center gap-2">
            <Layers size={12} className="text-neutral-600" />
            <span className="text-[12px] text-neutral-600">{totalCount} components</span>
            <span className="text-[11px] text-neutral-700 ml-auto">
              ESC {page !== "home" ? "back" : "close"}
            </span>
          </div>
        )}
      </div>
    </>
  );
}

function AgentNodeRow({ nodeDef, focused, onHover, onSelect, onToggle, selected }) {
  const rowRef = useRef(null);
  useEffect(() => {
    if (focused) rowRef.current?.scrollIntoView({ block: "nearest" });
  }, [focused]);

  const Icon = nodeDef.icon;
  const rgb = nodeDef.accentColor;
  const accent = rgb ? `rgb(${rgb})` : "#d4d4d4";
  return (
    <button
      ref={rowRef}
      onClick={onSelect}
      onMouseEnter={onHover}
      className="bb-nav-item flex items-center gap-3.5 w-full px-3.5 py-3.5 rounded-xl text-left group"
      style={
        rgb && (selected || focused)
          ? {
              backgroundColor: `rgba(${rgb}, ${selected ? 0.14 : 0.08})`,
              boxShadow: `inset 2px 0 0 ${selected ? accent : `rgba(${rgb}, 0.5)`}`,
            }
          : selected
          ? { backgroundColor: "rgba(255,255,255,0.07)" }
          : focused
          ? { backgroundColor: "rgba(255,255,255,0.05)" }
          : undefined
      }
    >
      <div className="w-[26px] h-[26px] shrink-0 flex items-center justify-center">
        {nodeDef.logoUrl ? (
          <img
            src={nodeDef.logoUrl}
            alt={nodeDef.label}
            className="w-[26px] h-[26px] object-contain"
            style={nodeDef.imgFilter ? { filter: nodeDef.imgFilter } : undefined}
          />
        ) : Icon ? (
          <Icon size={22} strokeWidth={1.7} style={{ color: accent }} />
        ) : (
          <Bot size={22} strokeWidth={1.7} className="text-neutral-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-white leading-tight truncate">{nodeDef.label}</div>
        {nodeDef.description && (
          <div className="text-[12px] text-neutral-500 mt-0.5 truncate">{nodeDef.description}</div>
        )}
      </div>
      {selected ? (
        <CheckCircle2 size={16} className="shrink-0" style={{ color: accent }} />
      ) : (
        <span
          role="button"
          tabIndex={-1}
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className="opacity-0 group-hover:opacity-100 p-1 text-neutral-600 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all shrink-0"
          title="Add to selection"
        >
          <Plus size={13} />
        </span>
      )}
    </button>
  );
}
