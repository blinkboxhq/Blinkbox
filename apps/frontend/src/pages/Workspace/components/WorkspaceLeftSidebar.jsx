import React, { useState } from "react";
import { Sidebar, SidebarBody, useSidebar } from '../../../components/ui/sidebar';
import { NodeRegistry } from '../nodeRegistry';
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

const DraggableSidebarItem = ({ nodeKey, node, index }) => {
  const { open, animate } = useSidebar();
  const Icon = node.icon || Zap;
  const accent = node.accentColor || "161,161,170";

  const handleDragStart = (event) => {
    const payload = { backendType: nodeKey, ...node };
    event.dataTransfer.setData('application/json', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      draggable
      onDragStart={handleDragStart}
      whileHover={{
        backgroundColor: `rgba(${accent},0.06)`,
        x: 2,
      }}
      whileTap={{ scale: 0.97 }}
      className="flex items-center justify-start gap-4 py-3 px-2 group/sidebar rounded-lg cursor-grab active:cursor-grabbing w-full overflow-hidden"
    >
      <motion.div
        whileHover={{ scale: 1.15, rotate: -5 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className={`shrink-0 p-2 rounded-lg ${node.bgClass} ${node.colorClass}`}
        style={{ boxShadow: `0 0 10px rgba(${accent},0.12)` }}
      >
        <Icon className="w-5 h-5" />
      </motion.div>

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
          {node.category}
        </span>
      </motion.div>
    </motion.div>
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
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 border border-zinc-700/50"
            >
              <Zap className="w-5 h-5 text-blue-400" />
            </motion.div>
            {open && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="text-zinc-200 font-semibold tracking-widest text-sm whitespace-nowrap"
              >
                BLINKBOX
              </motion.span>
            )}
          </div>

          {/* Node Palette */}
          <div className="flex flex-col gap-1">
            {Object.entries(NodeRegistry).map(([key, node], index) => (
              <DraggableSidebarItem key={key} nodeKey={key} node={node} index={index} />
            ))}
          </div>

        </div>
      </SidebarBody>
    </Sidebar>
  );
}
