import { useState, useCallback, useEffect, useRef } from "react";
import { Brain, Database, Wrench, ArrowLeft, X, Search, Code2, Globe, FileText,
  Mail, Calculator, CheckSquare, Server, Shield, BookOpen, GitBranch,
  Bot, Plug, CheckCircle2, Plus, ChevronRight } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NodeRegistry } from "../nodeRegistry";

const TOOL_SUBCATEGORIES = [
  { id: "search",        label: "Search",             icon: Search,      nodes: ["tool_wikipedia","tool_google_search","tool_bing_search","tool_brave_search","tool_tavily","tool_exa","tool_duckduckgo","tool_searxng","tool_youtube_search","tool_news","tool_arxiv","tool_wolfram"] },
  { id: "code",          label: "Code & Terminal",    icon: Code2,       nodes: ["tool_js","tool_python","tool_bash","tool_ssh","tool_docker_exec","tool_git","tool_npm","tool_virtual_computer"] },
  { id: "web",           label: "Browser & Web",      icon: Globe,       nodes: ["tool_scraper","tool_screenshot","tool_form_fill","tool_link_checker","tool_sitemap","tool_http_request"] },
  { id: "files",         label: "Files & Data",       icon: FileText,    nodes: ["tool_file_read","tool_file_write","tool_csv","tool_pdf","tool_json","tool_excel","tool_image_analyze"] },
  { id: "databases",     label: "Databases",          icon: Database,    nodes: ["tool_sql","tool_mongodb","tool_redis","tool_elasticsearch","tool_supabase"] },
  { id: "comms",         label: "Communication",      icon: Mail,        nodes: ["tool_email","tool_slack","tool_discord","tool_telegram","tool_sms","tool_webhook"] },
  { id: "ai_spec",       label: "AI Specialized",     icon: Brain,       nodes: ["tool_summarize","tool_translate","tool_sentiment","tool_entity_extract","tool_classify","tool_image_generate","tool_stt","tool_tts","tool_ocr"] },
  { id: "compute",       label: "Math & Compute",     icon: Calculator,  nodes: ["tool_calculator","tool_unit_convert","tool_currency","tool_datetime","tool_statistics","tool_regex"] },
  { id: "productivity",  label: "Productivity",       icon: CheckSquare, nodes: ["tool_calendar","tool_task","tool_note","tool_reminder","tool_approval","tool_timer"] },
  { id: "infra",         label: "Infrastructure",     icon: Server,      nodes: ["tool_aws","tool_gcp","tool_azure","tool_kubernetes","tool_terraform","tool_docker_compose","tool_ansible","tool_vercel_deploy"] },
  { id: "security",      label: "Security & Network", icon: Shield,      nodes: ["tool_password","tool_hash","tool_jwt","tool_ip_geo","tool_whois","tool_nmap","tool_ssl_check"] },
  { id: "reference",     label: "Reference",          icon: BookOpen,    nodes: ["tool_dictionary","tool_weather","tool_stock","tool_crypto","tool_timezone","tool_exchange_rate"] },
  { id: "utils",         label: "Utilities",          icon: Wrench,      nodes: ["tool_url_shortener","tool_qr","tool_uuid","tool_data_diff","tool_html_parse","tool_xml_parse","tool_base64"] },
  { id: "orchestration", label: "Orchestration",      icon: GitBranch,   nodes: ["tool_think","tool_sub_agent","tool_call_workflow","tool_mcp_client","tool_memory_store"] },
];

const AGENT_CATEGORIES = [
  { id: "chat_model",   label: "Chat Model",   icon: Brain,   slotId: "llm",         nodes: ["agent_openai","agent_anthropic","agent_gemini","agent_perplexity","agent_xai","agent_deepseek","agent_moonshot","agent_groq","agent_nvidia_nim","agent_gemma","agent_ollama","agent_lmstudio"] },
  { id: "memory",       label: "Memory",       icon: Database,slotId: "memory",       nodes: ["agent_memory_window","agent_memory_redis","agent_memory_mongodb","agent_memory_postgres","agent_memory_pinecone","agent_memory_supabase","agent_memory_zep"] },
  { id: "tools",        label: "Tools",        icon: Wrench,  slotId: "tools",        subCategories: TOOL_SUBCATEGORIES },
  { id: "integration",  label: "Integration",  icon: Plug,    slotId: "integration",  nodes: ["agent_integration_slack","agent_integration_gmail","agent_integration_discord","agent_integration_telegram","agent_integration_notion","agent_integration_airtable","agent_integration_google_sheets","agent_integration_google_calendar","agent_integration_google_drive","agent_integration_outlook","agent_integration_github","agent_integration_linear","agent_integration_hubspot","agent_integration_jira","agent_integration_asana","agent_integration_stripe","agent_integration_shopify","agent_integration_clickup","agent_integration_twilio","agent_integration_mongodb","agent_integration_postgres","agent_integration_redis"] },
];

const SLOT_OFFSETS = {
  llm:         { x: -30,  y: 160 },
  memory:      { x: 30,   y: 160 },
  integration: { x: 90,   y: 160 },
  tools:       { x: 150,  y: 160 },
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
  const isSubCatPage  = page.startsWith("tools:");
  const subCatId      = isSubCatPage ? page.split(":")[1] : null;
  const currentSubCat = subCatId ? TOOL_SUBCATEGORIES.find(s => s.id === subCatId) : null;

  const currentSlotId = currentSubCat
    ? "tools"
    : currentCat?.slotId || "tools";

  const currentNodes = currentSubCat
    ? currentSubCat.nodes.map(k => ({ key: k, ...NodeRegistry[k] })).filter(n => n.label)
    : currentCat?.nodes
    ? currentCat.nodes.map(k => ({ key: k, ...NodeRegistry[k] })).filter(n => n.label)
    : [];

  const query = search.trim().toLowerCase();
  const visibleNodes = query
    ? currentNodes.filter(n => n.label?.toLowerCase().includes(query) || n.key.toLowerCase().includes(query))
    : currentNodes;

  useEffect(() => { setFocusIdx(0); }, [search, page]);

  const isListPage = page !== "home" && page !== "tools" && currentNodes.length > 0;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (isSubCatPage) { setPage("tools"); setSearch(""); return; }
        if (page !== "home") { setPage("home"); setSearch(""); return; }
        if (search) { setSearch(""); return; }
        close();
        return;
      }
      if (!isListPage && !isSubCatPage) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, visibleNodes.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && visibleNodes[focusIdx]) {
        if (selected.length > 0) toggleSelect(visibleNodes[focusIdx].key, currentSlotId);
        else commitSingle(visibleNodes[focusIdx].key, currentSlotId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, isListPage, isSubCatPage, visibleNodes, focusIdx, selected, currentSlotId, page, search, commitSingle, toggleSelect]);

  const backLabel = isSubCatPage ? "Tools" : page !== "home" ? "Back" : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-[460px] mx-4 bg-[#111113] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "72vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0">
          {page !== "home" && (
            <button
              onClick={() => { setPage(isSubCatPage ? "tools" : "home"); setSearch(""); }}
              className="p-2 text-white/40 hover:text-white hover:bg-white/[0.07] rounded-xl transition-colors shrink-0"
              title={`Back to ${backLabel}`}
            >
              <ArrowLeft size={14} />
            </button>
          )}

          {(isListPage || isSubCatPage) ? (
            <div className="flex-1 flex items-center gap-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 focus-within:border-white/20 transition-colors">
              <Search size={14} className="text-white/40 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/35"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-white/30 hover:text-white/70 transition-colors">
                  <X size={12} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1">
              <div className="text-[14px] font-bold text-white">Add to Agent</div>
              <div className="text-[11px] text-white/35 mt-0.5">Model · Memory · Tools · Integrations</div>
            </div>
          )}

          <button
            onClick={close}
            className="p-2 text-white/40 hover:text-white hover:bg-white/[0.07] rounded-xl transition-colors shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Sub-heading when in a sub-page */}
        {(currentCat || currentSubCat) && !isListPage && !isSubCatPage && page === "tools" && (
          <div className="px-4 pb-2 shrink-0">
            <div className="text-[11px] text-white/35 uppercase tracking-wider font-semibold">Tools</div>
          </div>
        )}
        {(currentCat && isListPage) && !query && (
          <div className="px-4 pb-2 shrink-0">
            <div className="text-[11px] text-white/35 uppercase tracking-wider font-semibold">{currentCat.label}</div>
          </div>
        )}
        {currentSubCat && !query && (
          <div className="px-4 pb-2 shrink-0">
            <div className="text-[11px] text-white/35 uppercase tracking-wider font-semibold">{currentSubCat.label}</div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-2 pb-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}>

          {/* Home — 4 agent categories */}
          {page === "home" && AGENT_CATEGORIES.map(cat => {
            const CatIcon = cat.icon;
            const count = cat.subCategories
              ? cat.subCategories.reduce((a, s) => a + s.nodes.filter(k => NodeRegistry[k]).length, 0)
              : cat.nodes.filter(k => NodeRegistry[k]).length;
            return (
              <button
                key={cat.id}
                onClick={() => setPage(cat.id)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors text-left group"
              >
                <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                  <CatIcon size={18} strokeWidth={1.8} className="text-white/60 group-hover:text-white/90 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-white leading-tight">{cat.label}</div>
                  <div className="text-[11px] text-white/35 mt-0.5">{count} available</div>
                </div>
                <ChevronRight size={13} className="text-white/25 shrink-0 group-hover:text-white/50 transition-colors" />
              </button>
            );
          })}

          {/* Tools — sub-category list */}
          {page === "tools" && TOOL_SUBCATEGORIES.map(sub => {
            const SubIcon = sub.icon;
            const count = sub.nodes.filter(k => NodeRegistry[k]).length;
            if (count === 0) return null;
            return (
              <button
                key={sub.id}
                onClick={() => setPage(`tools:${sub.id}`)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors text-left group"
              >
                <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                  <SubIcon size={18} strokeWidth={1.8} className="text-white/60 group-hover:text-white/90 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-white leading-tight">{sub.label}</div>
                  <div className="text-[11px] text-white/35 mt-0.5">{count} tools</div>
                </div>
                <ChevronRight size={13} className="text-white/25 shrink-0 group-hover:text-white/50 transition-colors" />
              </button>
            );
          })}

          {/* Node list (flat) */}
          {(isListPage || isSubCatPage) && (
            visibleNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Search size={26} className="text-white/20" />
                <p className="text-[12px] text-white/35">No results for "{search}"</p>
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

        {/* Multi-select footer */}
        {selected.length > 0 && (
          <div className="shrink-0 px-3 py-2.5 border-t border-white/[0.06] flex items-center gap-2">
            <button onClick={() => setSelected([])} className="p-1.5 text-white/35 hover:text-white hover:bg-white/[0.07] rounded-lg transition-colors shrink-0">
              <X size={13} />
            </button>
            <span className="text-[12px] text-white/45 flex-1">{selected.length} selected</span>
            <button
              onClick={commitAll}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-black text-[12px] font-bold transition-colors hover:bg-white/90"
            >
              <Plus size={13} />
              Add {selected.length}
            </button>
          </div>
        )}

        {/* Footer hint */}
        <div className="shrink-0 px-4 py-2.5 border-t border-white/[0.06] flex items-center gap-3">
          {(isListPage || isSubCatPage) ? (
            <>
              <span className="text-[10px] text-white/25">↑↓ navigate</span>
              <span className="text-[10px] text-white/25">↵ add</span>
            </>
          ) : null}
          <span className="text-[10px] text-white/25">ESC {page !== "home" ? "back" : "close"}</span>
        </div>
      </div>
    </div>
  );
}

function AgentNodeRow({ nodeDef, focused, onHover, onSelect, onToggle, selected }) {
  const rowRef = useRef(null);
  useEffect(() => {
    if (focused) rowRef.current?.scrollIntoView({ block: "nearest" });
  }, [focused]);

  const Icon = nodeDef.icon;
  return (
    <button
      ref={rowRef}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-100 text-left group ${
        selected ? "bg-white/[0.09]" : focused ? "bg-white/[0.07]" : "hover:bg-white/[0.05]"
      }`}
    >
      <div className="w-8 h-8 shrink-0 flex items-center justify-center">
        {nodeDef.logoUrl ? (
          <img
            src={nodeDef.logoUrl}
            alt={nodeDef.label}
            className="w-6 h-6 object-contain"
            style={nodeDef.imgFilter ? { filter: nodeDef.imgFilter } : undefined}
          />
        ) : Icon ? (
          <Icon size={18} strokeWidth={1.8} className="text-white/70" />
        ) : (
          <Bot size={18} strokeWidth={1.8} className="text-white/40" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-white leading-tight">{nodeDef.label}</div>
        {nodeDef.description && (
          <div className="text-[11px] text-white/40 mt-0.5 truncate">{nodeDef.description}</div>
        )}
      </div>
      {selected ? (
        <CheckCircle2 size={14} className="text-white shrink-0" />
      ) : (
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-white hover:bg-white/[0.1] rounded-lg transition-all shrink-0"
          title="Add to selection"
        >
          <Plus size={12} />
        </button>
      )}
    </button>
  );
}
