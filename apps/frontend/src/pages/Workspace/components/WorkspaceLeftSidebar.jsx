import React, { useState } from "react";
import { Sidebar, SidebarBody, useSidebar } from '../../../components/ui/sidebar';
import { NodeRegistry } from '../nodeRegistry';
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

const DraggableSidebarItem = ({ nodeKey, node }) => {
  const { open, animate } = useSidebar();
  const Icon = node.icon || Zap;

  const handleDragStart = (event) => {
    const payload = { backendType: nodeKey, ...node };
    event.dataTransfer.setData('application/json', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center justify-start gap-4 py-3 px-2 group/sidebar rounded-lg hover:bg-zinc-800/40 cursor-grab active:cursor-grabbing transition-colors w-full overflow-hidden"
    >
      <div className={`shrink-0 p-2 rounded-lg ${node.bgClass} ${node.colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>

      <motion.div
        animate={{
          display: animate ? (open ? "flex" : "none") : "flex",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="flex-col overflow-hidden whitespace-nowrap"
      >
        <span className="text-zinc-200 text-[13px] font-medium tracking-tight group-hover/sidebar:translate-x-0.5 transition duration-150">
          {node.label}
        </span>
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest block">
          {node.type}
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
          <div className="px-2 py-4 mb-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 border border-zinc-700/50">
              <Zap className="w-5 h-5 text-zinc-300" />
            </div>
            {open && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-zinc-200 font-semibold tracking-widest text-sm whitespace-nowrap"
              >
                BLINKBOX
              </motion.span>
            )}
          </div>

          {/* Node Palette */}
          <div className="flex flex-col gap-1">
            {Object.entries(NodeRegistry).map(([key, node]) => (
              <DraggableSidebarItem key={key} nodeKey={key} node={node} />
            ))}
          </div>

        </div>
      </SidebarBody>
    </Sidebar>
  );
}
