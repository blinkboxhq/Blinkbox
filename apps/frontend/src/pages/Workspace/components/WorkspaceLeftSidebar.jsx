import React, { useState } from "react";
import { Sidebar, SidebarBody, useSidebar } from '../../../components/ui/sidebar';
import { NodeRegistry, CATEGORIES } from '../nodeRegistry';
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronRight } from "lucide-react";
import logo from "../../../assets/logo.svg";
import useWorkspaceStore from "../../../store/workspaceStore";
import { useReactFlow } from "@xyflow/react";

const DraggableSidebarItem = ({ nodeKey, node }) => {
  const { open, animate } = useSidebar();
  const Icon = node.icon || Zap;
  const addNode = useWorkspaceStore((s) => s.addNode);
  const { getViewport } = useReactFlow();

  const handleDragStart = (event) => {
    const payload = { backendType: nodeKey, ...node };
    event.dataTransfer.setData('application/json', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleDoubleClick = () => {
    const { x, y, zoom } = getViewport();
    const cx = (window.innerWidth / 2 - x) / zoom;
    const cy = (window.innerHeight / 2 - y) / zoom;
    const jitter = () => (Math.random() - 0.5) * 80;
    addNode({
      id: `${nodeKey}-${crypto.randomUUID()}`,
      type: 'custom',
      position: { x: cx + jitter(), y: cy + jitter() },
      data: { backendType: nodeKey, label: node.label, type: node.category === 'trigger' ? 'trigger' : 'action', config: {} },
    });
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={handleDoubleClick}
      title={`${node.label} — double-click or drag to add`}
      className="flex items-center justify-start gap-3 py-2 px-2 group/sidebar rounded-lg hover:bg-zinc-800/40 cursor-grab active:cursor-grabbing transition-colors w-full overflow-hidden"
    >
      <div className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center bg-zinc-800/80 text-white">
        <Icon className="w-3.5 h-3.5" />
      </div>

      <motion.div
        animate={{
          display: animate ? (open ? "flex" : "none") : "flex",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="flex-col overflow-hidden whitespace-nowrap"
      >
        <span className="text-zinc-200 text-[12px] font-medium tracking-tight">
          {node.label}
        </span>
      </motion.div>
    </div>
  );
};

const CategoryFolder = ({ category, nodes }) => {
  const [expanded, setExpanded] = useState(false);
  const { open: sidebarOpen, animate } = useSidebar();
  const CatIcon = category.icon;
  const nodeCount = nodes.length;

  return (
    <div className="flex flex-col">
      {/* Category header — clickable toggle */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-zinc-800/30 transition-colors w-full group"
      >
        <div className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center bg-zinc-800/50 text-zinc-500 group-hover:text-zinc-400 transition-colors">
          <CatIcon className="w-3.5 h-3.5" />
        </div>

        <motion.div
          animate={{
            display: animate ? (sidebarOpen ? "flex" : "none") : "flex",
            opacity: animate ? (sidebarOpen ? 1 : 0) : 1,
          }}
          className="flex-1 items-center justify-between overflow-hidden whitespace-nowrap"
        >
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {category.label}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-zinc-700 font-mono">{nodeCount}</span>
            <motion.div
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRight className="w-3 h-3 text-zinc-600" />
            </motion.div>
          </div>
        </motion.div>
      </button>

      {/* Nodes list — collapsible */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col pl-1">
              {nodes.map(([key, node]) => (
                <DraggableSidebarItem key={key} nodeKey={key} node={node} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function WorkspaceLeftSidebar() {
  const [open, setOpen] = useState(false);

  // Group nodes by category
  const nodeEntries = Object.entries(NodeRegistry);
  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    nodes: nodeEntries.filter(([, node]) => node.category === cat.id),
  })).filter((g) => g.nodes.length > 0);

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="bg-zinc-950">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden sidebar-scroll">

          {/* Logo */}
          <div className="px-3 h-14 flex items-center gap-3 border-b-2 border-white/15 shrink-0 mb-2">
            <img
              src={logo}
              alt="BlinkBox"
              className="w-9 h-9 rounded-lg shrink-0 object-contain"
            />
            {open && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-zinc-300 font-semibold tracking-widest text-xs whitespace-nowrap"
              >
                Blinkbox
              </motion.span>
            )}
          </div>

          {/* Categorized Node Palette */}
          <div className="flex flex-col gap-1">
            {grouped.map(({ category, nodes }) => (
              <CategoryFolder key={category.id} category={category} nodes={nodes} />
            ))}
          </div>

        </div>
      </SidebarBody>
    </Sidebar>
  );
}
