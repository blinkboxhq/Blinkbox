import React, { useState } from "react";
import { Sidebar, SidebarBody, useSidebar } from '../../../components/ui/sidebar';
import { NodeRegistry } from '../nodeRegistry';
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
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
    // Convert viewport center to flow coordinates
    const cx = (window.innerWidth / 2 - x) / zoom;
    const cy = (window.innerHeight / 2 - y) / zoom;
    // Slight random offset so stacked nodes are visible
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
      title="Double-click to add to canvas"
      className="flex items-center justify-start gap-3 py-2.5 px-2 group/sidebar rounded-lg hover:bg-zinc-800/40 cursor-grab active:cursor-grabbing transition-colors w-full overflow-hidden"
    >
      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-800/80 ${node.colorClass}`}>
        <Icon className="w-4 h-4" strokeWidth={1.75} />
      </div>

      <motion.div
        animate={{
          display: animate ? (open ? "flex" : "none") : "flex",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="flex-col overflow-hidden whitespace-nowrap"
      >
        <span className="text-zinc-200 text-[13px] font-medium tracking-tight">
          {node.label}
        </span>
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider block">
          {node.category}
        </span>
      </motion.div>
    </div>
  );
};

export default function WorkspaceLeftSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="bg-zinc-950">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">

          {/* Logo */}
          <div className="px-2 py-4 mb-6 flex items-center gap-3">
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
                BLINKBOX
              </motion.span>
            )}
          </div>

          {/* Node Palette */}
          <div className="flex flex-col gap-0.5">
            {Object.entries(NodeRegistry).map(([key, node]) => (
              <DraggableSidebarItem key={key} nodeKey={key} node={node} />
            ))}
          </div>

        </div>
      </SidebarBody>
    </Sidebar>
  );
}
