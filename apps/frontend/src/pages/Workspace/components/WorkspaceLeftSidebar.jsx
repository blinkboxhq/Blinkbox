import React, { useState } from "react";
import { Sidebar, SidebarBody, useSidebar } from '../../../components/ui/sidebar';
import { NodeRegistry } from '../nodeRegistry';
import { motion } from "framer-motion";
import { Zap } from "lucide-react"; 

// 🎯 The Draggable Component wrapped in Framer Motion logic
const DraggableSidebarItem = ({ nodeKey, node }) => {
  const { open, animate } = useSidebar();
  const Icon = node.icon || Zap;

  // 📡 Packaging the data for the Canvas to catch
  const handleDragStart = (event) => {
    const payload = { backendType: nodeKey, ...node };
    event.dataTransfer.setData('application/json', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center justify-start gap-4 py-3 px-2 group/sidebar rounded-xl hover:bg-white/5 cursor-grab active:cursor-grabbing transition-all w-full overflow-hidden"
    >
      <div className={`shrink-0 p-2 rounded-lg ${node.bgClass} ${node.colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      
      <motion.div
        animate={{
          display: animate ? (open ? "flex" : "none") : "flex",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="flex-col overflow-hidden whitespace-nowrap"
      >
        <span className="text-slate-200 text-sm font-bold group-hover/sidebar:translate-x-1 transition duration-150">
          {node.label}
        </span>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest block group-hover/sidebar:translate-x-1 transition duration-150">
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
      <SidebarBody className="bg-[#0a0a0a]">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          
          {/* THE HEADER LOGO */}
          <div className="px-2 py-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              <Zap className="w-6 h-6 text-white" />
            </div>
            {open && (
              <motion.span 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="text-white font-extrabold tracking-widest text-lg whitespace-nowrap"
              >
                BLINKBOX
              </motion.span>
            )}
          </div>

          {/* THE DRAGGABLE NODES */}
          <div className="flex flex-col gap-2">
            {Object.entries(NodeRegistry).map(([key, node]) => (
              <DraggableSidebarItem key={key} nodeKey={key} node={node} />
            ))}
          </div>

        </div>
      </SidebarBody>
    </Sidebar>
  );
}