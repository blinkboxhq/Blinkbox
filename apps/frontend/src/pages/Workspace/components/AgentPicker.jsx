import { useState, useCallback } from "react";
import { Brain, Database, Wrench, ArrowLeft, X, Search, Code2, Globe, FileText,
  Mail, Calculator, CheckSquare, Server, Shield, BookOpen, GitBranch, Zap, Bot, Network, Plug, CheckCircle2, Plus } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NodeRegistry } from "../nodeRegistry";

const TOOL_SUBCATEGORIES = [
  { id: "search",       label: "Search",            icon: Search,      color: "#60a5fa", nodes: ["tool_wikipedia","tool_google_search","tool_bing_search","tool_brave_search","tool_tavily","tool_exa","tool_duckduckgo","tool_searxng","tool_youtube_search","tool_news","tool_arxiv","tool_wolfram"] },
  { id: "code",         label: "Code & Terminal",   icon: Code2,       color: "#34d399", nodes: ["tool_js","tool_python","tool_bash","tool_ssh","tool_docker_exec","tool_git","tool_npm","tool_virtual_computer"] },
  { id: "web",          label: "Browser & Web",     icon: Globe,       color: "#38bdf8", nodes: ["tool_scraper","tool_screenshot","tool_form_fill","tool_link_checker","tool_sitemap","tool_http_request"] },
  { id: "files",        label: "Files & Data",      icon: FileText,    color: "#fbbf24", nodes: ["tool_file_read","tool_file_write","tool_csv","tool_pdf","tool_json","tool_excel","tool_image_analyze"] },
  { id: "databases",    label: "Databases",         icon: Database,    color: "#22d3ee", nodes: ["tool_sql","tool_mongodb","tool_redis","tool_elasticsearch","tool_supabase"] },
  { id: "comms",        label: "Communication",     icon: Mail,        color: "#fb7185", nodes: ["tool_email","tool_slack","tool_discord","tool_telegram","tool_sms","tool_webhook"] },
  { id: "ai_spec",      label: "AI Specialized",    icon: Brain,       color: "#c084fc", nodes: ["tool_summarize","tool_translate","tool_sentiment","tool_entity_extract","tool_classify","tool_image_generate","tool_stt","tool_tts","tool_ocr"] },
  { id: "compute",      label: "Math & Compute",    icon: Calculator,  color: "#fde047", nodes: ["tool_calculator","tool_unit_convert","tool_currency","tool_datetime","tool_statistics","tool_regex"] },
  { id: "productivity", label: "Productivity",      icon: CheckSquare, color: "#4ade80", nodes: ["tool_calendar","tool_task","tool_note","tool_reminder","tool_approval","tool_timer"] },
  { id: "infra",        label: "Infrastructure",    icon: Server,      color: "#fb923c", nodes: ["tool_aws","tool_gcp","tool_azure","tool_kubernetes","tool_terraform","tool_docker_compose","tool_ansible","tool_vercel_deploy"] },
  { id: "security",     label: "Security & Network",icon: Shield,      color: "#f87171", nodes: ["tool_password","tool_hash","tool_jwt","tool_ip_geo","tool_whois","tool_nmap","tool_ssl_check"] },
  { id: "reference",    label: "Reference",         icon: BookOpen,    color: "#2dd4bf", nodes: ["tool_dictionary","tool_weather","tool_stock","tool_crypto","tool_timezone","tool_exchange_rate"] },
  { id: "utils",        label: "Utilities",         icon: Wrench,      color: "#a1a1aa", nodes: ["tool_url_shortener","tool_qr","tool_uuid","tool_data_diff","tool_html_parse","tool_xml_parse","tool_base64"] },
  { id: "orchestration",label: "Orchestration",     icon: GitBranch,   color: "#a78bfa", nodes: ["tool_think","tool_sub_agent","tool_call_workflow","tool_mcp_client","tool_memory_store"] },
];

const AGENT_CATEGORIES = [
  {
    id: "chat_model",
    label: "Chat Model",
    icon: Brain,
    color: "#a78bfa",
    slotId: "llm",
    nodes: ["agent_openai", "agent_anthropic", "agent_gemini", "agent_perplexity", "agent_xai", "agent_deepseek", "agent_moonshot", "agent_groq", "agent_ollama"],
  },
  {
    id: "memory",
    label: "Memory",
    icon: Database,
    color: "#c084fc",
    slotId: "memory",
    nodes: ["agent_memory_window", "agent_memory_redis", "agent_memory_mongodb", "agent_memory_postgres", "agent_memory_pinecone", "agent_memory_supabase", "agent_memory_zep"],
  },
  {
    id: "tools",
    label: "Tools",
    icon: Wrench,
    color: "#fb923c",
    slotId: "tools",
    subCategories: TOOL_SUBCATEGORIES,
  },
  {
    id: "integration",
    label: "Integration",
    icon: Plug,
    color: "#34d399",
    slotId: "integration",
    nodes: [
      "agent_integration_slack","agent_integration_gmail","agent_integration_discord",
      "agent_integration_telegram","agent_integration_notion","agent_integration_airtable",
      "agent_integration_google_sheets","agent_integration_google_calendar","agent_integration_google_drive",
      "agent_integration_outlook","agent_integration_github","agent_integration_linear",
      "agent_integration_hubspot","agent_integration_jira","agent_integration_asana",
      "agent_integration_stripe","agent_integration_shopify","agent_integration_clickup",
      "agent_integration_twilio","agent_integration_mongodb","agent_integration_postgres",
      "agent_integration_redis",
    ],
  },
];

const SLOT_OFFSETS = {
  llm:         { x: -30, y: 160 },
  memory:      { x: 30,  y: 160 },
  integration: { x: 90,  y: 160 },
  tools:       { x: 150, y: 160 },
};

export default function AgentPicker() {
  const [page, setPage] = useState("home");
  const [selected, setSelected] = useState([]);

  const agentPickerParentId = useWorkspaceStore(s => s.agentPickerParentId);
  const closeAgentPicker    = useWorkspaceStore(s => s.closeAgentPicker);
  const addNode             = useWorkspaceStore(s => s.addNode);
  const onConnect           = useWorkspaceStore(s => s.onConnect);
  const { getNode }         = useReactFlow();

  const handleClose = () => { closeAgentPicker(); setPage("home"); setSelected([]); };

  const toggleSelect = useCallback((nodeKey, slotId) => {
    setSelected(prev => {
      const idx = prev.findIndex(s => s.nodeKey === nodeKey);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      return [...prev, { nodeKey, slotId }];
    });
  }, []);

  const commitAll = useCallback(() => {
    if (selected.length === 0) return;
    const parentNode = getNode(agentPickerParentId);
    selected.forEach(({ nodeKey, slotId }, i) => {
      const off = SLOT_OFFSETS[slotId] || { x: 60, y: 220 };
      const newId = `${nodeKey}-${crypto.randomUUID()}`;
      const nodeDef = NodeRegistry[nodeKey];
      addNode({
        id: newId,
        type: "custom",
        position: parentNode
          ? { x: parentNode.position.x + off.x + i * 30, y: parentNode.position.y + off.y + i * 30 }
          : { x: 400 + i * 200, y: 300 },
        data: { backendType: nodeKey, label: nodeDef?.label || nodeKey, type: "action", config: {}, isAgentComponent: true },
      });
      onConnect({ source: newId, sourceHandle: "agent_out", target: agentPickerParentId, targetHandle: slotId });
    });
    closeAgentPicker();
    setPage("home");
    setSelected([]);
  }, [selected, agentPickerParentId, addNode, onConnect, getNode, closeAgentPicker]);

  const SelectionFooter = () => selected.length === 0 ? null : (
    <div className="shrink-0 px-4 py-3 border-t border-white/10 bg-[#0d0d10] flex items-center gap-2">
      <button onClick={() => setSelected([])} className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/[0.06] rounded-lg transition-colors shrink-0" title="Clear">
        <X className="w-3.5 h-3.5" />
      </button>
      <span className="text-[12px] text-white/50 flex-1">{selected.length} selected</span>
      <button onClick={commitAll} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[12px] font-bold transition-colors">
        <Plus className="w-3.5 h-3.5" />
        Add {selected.length}
      </button>
    </div>
  );

  const dragStart = useCallback((e, nodeKey) => {
    const def = NodeRegistry[nodeKey];
    if (!def) return;
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/json", JSON.stringify({
      backendType: nodeKey,
      label: def.label,
      type: "action",
      config: {},
      isAgentComponent: true,
    }));
    closeAgentPicker();
  }, [closeAgentPicker]);

  const handleSelect = useCallback((nodeKey, slotId) => {
    const parentNode = getNode(agentPickerParentId);
    if (!parentNode) return;
    const off = SLOT_OFFSETS[slotId] || { x: 60, y: 220 };
    const newId = `${nodeKey}-${crypto.randomUUID()}`;
    const nodeDef = NodeRegistry[nodeKey];
    addNode({
      id: newId,
      type: "custom",
      position: { x: parentNode.position.x + off.x, y: parentNode.position.y + off.y },
      data: { backendType: nodeKey, label: nodeDef?.label || nodeKey, type: "action", config: {}, isAgentComponent: true },
    });
    onConnect({ source: newId, sourceHandle: "agent_out", target: agentPickerParentId, targetHandle: slotId });
    handleClose();
  }, [agentPickerParentId, addNode, onConnect, getNode]);

  const currentCat = AGENT_CATEGORIES.find(c => c.id === page);
  const isSubCatPage = page.startsWith("tools:");
  const subCatId = isSubCatPage ? page.split(":")[1] : null;
  const currentSubCat = subCatId ? TOOL_SUBCATEGORIES.find(s => s.id === subCatId) : null;

  // Tool sub-category node list
  if (isSubCatPage && currentSubCat) {
    const SubIcon = currentSubCat.icon;
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-5 pt-6 pb-5 shrink-0">
          <button onClick={() => setPage("tools")}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <SubIcon className="w-4 h-4 shrink-0" style={{ color: currentSubCat.color }} strokeWidth={1.6} />
          <div>
            <div className="text-[15px] font-bold text-zinc-100 leading-tight">{currentSubCat.label}</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">{currentSubCat.nodes.filter(k => NodeRegistry[k]).length} tools</div>
          </div>
          <button onClick={handleClose} className="ml-auto p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6 flex flex-col gap-0.5">
          {currentSubCat.nodes.map(key => {
            const def = NodeRegistry[key];
            if (!def) return null;
            const Icon = def.icon;
            const isSel = selected.some(s => s.nodeKey === key);
            return (
              <button key={key}
                draggable
                onDragStart={(e) => dragStart(e, key)}
                onClick={() => toggleSelect(key, "tools")}
                className={`flex items-center gap-4 w-full px-5 py-3.5 rounded-2xl border transition-all duration-150 text-left group cursor-grab active:cursor-grabbing ${isSel ? "bg-violet-500/10 border-violet-500/40" : "hover:bg-zinc-800/60 border-transparent hover:border-zinc-700/30"}`}>
                <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                  {def.logoUrl ? (
                    <img src={def.logoUrl} alt={def.label} className="w-6 h-6 object-contain" style={def.imgFilter ? { filter: def.imgFilter } : undefined} />
                  ) : (
                    <Icon className="w-6 h-6 shrink-0" style={{ color: def.colorClass?.replace("text-[","").replace("]","") }} strokeWidth={1.6} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-zinc-100 group-hover:text-white leading-tight">{def.label}</div>
                  {def.description && <div className="text-[11px] text-zinc-500 mt-0.5 group-hover:text-zinc-400 truncate">{def.description}</div>}
                </div>
                {isSel && <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />}
              </button>
            );
          })}
        </div>
        <SelectionFooter />
      </div>
    );
  }

  // Tools sub-category list
  if (page === "tools") {
    const toolsTotal = TOOL_SUBCATEGORIES.reduce((acc, s) => acc + s.nodes.filter(k => NodeRegistry[k]).length, 0);
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-5 pt-6 pb-5 shrink-0">
          <button onClick={() => setPage("home")}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Wrench className="w-5 h-5 shrink-0 text-orange-400" strokeWidth={1.6} />
          <div>
            <div className="text-[15px] font-bold text-zinc-100 leading-tight">Tools</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">{toolsTotal} tools across {TOOL_SUBCATEGORIES.length} categories</div>
          </div>
          <button onClick={handleClose} className="ml-auto p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6 flex flex-col gap-0.5">
          {TOOL_SUBCATEGORIES.map(sub => {
            const SubIcon = sub.icon;
            const count = sub.nodes.filter(k => NodeRegistry[k]).length;
            return (
              <button key={sub.id} onClick={() => setPage(`tools:${sub.id}`)}
                className="flex items-center gap-4 w-full px-5 py-3.5 rounded-2xl hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/30 transition-all duration-150 text-left group">
                <div className="w-7 h-7 flex items-center justify-center shrink-0">
                  <SubIcon className="w-5 h-5" style={{ color: sub.color }} strokeWidth={1.6} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-zinc-100 group-hover:text-white leading-tight">{sub.label}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{count} tools</div>
                </div>
                <span className="text-zinc-600 group-hover:text-zinc-400 text-lg leading-none">›</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Flat node list (for chat_model and memory)
  if (page !== "home" && currentCat) {
    const CatIcon = currentCat.icon;
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-5 pt-6 pb-5 shrink-0">
          <button onClick={() => setPage("home")}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <CatIcon className="w-5 h-5 shrink-0 text-white" strokeWidth={1.6} />
          <div>
            <div className="text-[15px] font-bold text-zinc-100 leading-tight">{currentCat.label}</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">{currentCat.nodes.filter(k => NodeRegistry[k]).length} available</div>
          </div>
          <button onClick={handleClose} className="ml-auto p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6 flex flex-col gap-0.5">
          {currentCat.nodes.map(key => {
            const def = NodeRegistry[key];
            if (!def) return null;
            const Icon = def.icon;
            const isSel = selected.some(s => s.nodeKey === key);
            return (
              <button key={key}
                draggable
                onDragStart={(e) => dragStart(e, key)}
                onClick={() => toggleSelect(key, currentCat.slotId)}
                className={`flex items-center gap-4 w-full px-5 py-4 rounded-2xl border transition-all duration-150 text-left group cursor-grab active:cursor-grabbing ${isSel ? "bg-violet-500/10 border-violet-500/40" : "hover:bg-zinc-800/60 border-transparent hover:border-zinc-700/30"}`}>
                <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                  {def.logoUrl ? (
                    <img src={def.logoUrl} alt={def.label} className="w-7 h-7 object-contain" style={def.imgFilter ? { filter: def.imgFilter } : undefined} />
                  ) : (
                    <Icon className="w-7 h-7 text-white" strokeWidth={1.6} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-zinc-100 group-hover:text-white leading-tight">{def.label}</div>
                  {def.description && <div className="text-[12px] text-zinc-500 mt-0.5 group-hover:text-zinc-400 truncate">{def.description}</div>}
                </div>
                {isSel && <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />}
              </button>
            );
          })}
        </div>
        <SelectionFooter />
      </div>
    );
  }

  // Home
  const totalTools = TOOL_SUBCATEGORIES.reduce((a, s) => a + s.nodes.filter(k => NodeRegistry[k]).length, 0);
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0">
        <div>
          <h2 className="text-[16px] font-bold text-zinc-100 tracking-tight">Add to Agent</h2>
          <p className="text-[13px] text-zinc-500 mt-1">Model, memory, or tool</p>
        </div>
        <button onClick={handleClose} className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-6 flex flex-col gap-0.5">
        {AGENT_CATEGORIES.map(cat => {
          const CatIcon = cat.icon;
          const count = cat.subCategories
            ? cat.subCategories.reduce((a, s) => a + s.nodes.filter(k => NodeRegistry[k]).length, 0)
            : cat.nodes.filter(k => NodeRegistry[k]).length;
          return (
            <button key={cat.id} onClick={() => setPage(cat.id)}
              className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/30 transition-all duration-150 text-left group">
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                <CatIcon className="w-7 h-7 text-white transition-colors" strokeWidth={1.6} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-zinc-100 group-hover:text-white leading-tight">{cat.label}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">{count} available</div>
              </div>
              <span className="text-zinc-600 group-hover:text-zinc-400 text-lg leading-none">›</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
