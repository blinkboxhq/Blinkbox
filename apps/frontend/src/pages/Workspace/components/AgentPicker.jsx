import { useState, useCallback } from "react";
import { Brain, Database, Zap, ArrowLeft, X } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NodeRegistry } from "../nodeRegistry";

const AGENT_CATEGORIES = [
  {
    id: "chat_model",
    label: "Chat Model",
    icon: Brain,
    color: "#a78bfa",
    slotId: "llm",
    nodes: ["openai", "anthropic", "gemini", "perplexity", "xai", "deepseek", "groq", "ollama"],
  },
  {
    id: "memory",
    label: "Memory",
    icon: Database,
    color: "#c084fc",
    slotId: "memory",
    nodes: ["agent_memory"],
  },
  {
    id: "tools",
    label: "Tools",
    icon: Zap,
    color: "#fb923c",
    slotId: "tools",
    nodes: ["agent_tool"],
  },
];

const SLOT_OFFSETS = {
  llm:    { x: -160, y: 220 },
  memory: { x:   60, y: 220 },
  tools:  { x:  280, y: 220 },
};

export default function AgentPicker() {
  const [page, setPage] = useState("home");

  const agentPickerParentId = useWorkspaceStore(s => s.agentPickerParentId);
  const closeAgentPicker    = useWorkspaceStore(s => s.closeAgentPicker);
  const addNode             = useWorkspaceStore(s => s.addNode);
  const onConnect           = useWorkspaceStore(s => s.onConnect);
  const { getNode }         = useReactFlow();

  const handleClose = () => {
    closeAgentPicker();
    setPage("home");
  };

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
      data: { backendType: nodeKey, label: nodeDef?.label || nodeKey, type: "action", config: {} },
    });

    setTimeout(() => {
      onConnect({ source: newId, sourceHandle: "agent_out", target: agentPickerParentId, targetHandle: slotId });
    }, 50);

    handleClose();
  }, [agentPickerParentId, addNode, onConnect, getNode]);

  const currentCat = AGENT_CATEGORIES.find(c => c.id === page);

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
            return (
              <button key={key} onClick={() => handleSelect(key, currentCat.slotId)}
                className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/30 transition-all duration-150 text-left group cursor-pointer">
                <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                  {def.logoUrl ? (
                    <img src={def.logoUrl} alt={def.label} className="w-7 h-7 object-contain"
                      style={def.imgFilter ? { filter: def.imgFilter } : undefined} />
                  ) : (
                    <Icon className="w-7 h-7 text-white" strokeWidth={1.6} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-zinc-100 group-hover:text-white leading-tight">{def.label}</div>
                  {def.description && (
                    <div className="text-[12px] text-zinc-500 mt-0.5 group-hover:text-zinc-400 truncate">{def.description}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0">
        <div>
          <h2 className="text-[16px] font-bold text-zinc-100 tracking-tight">Add to Agent</h2>
          <p className="text-[13px] text-zinc-500 mt-1">Choose a model, memory, or tool</p>
        </div>
        <button onClick={handleClose} className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-6 flex flex-col gap-0.5">
        {AGENT_CATEGORIES.map(cat => {
          const CatIcon = cat.icon;
          const count = cat.nodes.filter(k => NodeRegistry[k]).length;
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
