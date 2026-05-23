import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useWorkspaceStore from '../../../store/workspaceStore';
import TriggerPicker from './TriggerPicker';
import AddNodeSidebar from './AddNodeSidebar';
import AgentPicker from './AgentPicker';
import { playPanelOpen } from '../../../lib/sounds';
import { useDraggablePanel } from '../../../hooks/useDraggablePanel';

const springIn = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.8,
};

export default function WorkspaceRightSidebar({ width = 320 }) {
  const isTriggerPickerOpen = useWorkspaceStore(s => s.isTriggerPickerOpen);
  const isAddNodeOpen       = useWorkspaceStore(s => s.isAddNodeOpen);
  const isAgentPickerOpen   = useWorkspaceStore(s => s.isAgentPickerOpen);

  const isSidebarOpen = isAddNodeOpen || isAgentPickerOpen;
  const prevOpen = useRef(false);

  const [pos, startDrag] = useDraggablePanel(() => ({
    x: window.innerWidth - width,
    y: 52,
  }));

  useEffect(() => {
    if (isSidebarOpen && !prevOpen.current) playPanelOpen();
    prevOpen.current = isSidebarOpen;
  }, [isSidebarOpen]);

  return (
    <>
      {/* TriggerPicker renders as its own full-screen overlay */}
      <AnimatePresence>
        {isTriggerPickerOpen && <TriggerPicker />}
      </AnimatePresence>

      {/* Right sidebar for AddNode / AgentPicker */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            key="right-sidebar"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={springIn}
            className="fixed flex flex-col bg-neutral-950 border border-[#333] z-20 rounded-xl overflow-hidden shadow-2xl shadow-black/70 will-change-transform"
            style={{ left: pos.x, top: pos.y, width, height: 'calc(100vh - 64px)' }}
          >
            {/* Drag handle bar */}
            <div
              onMouseDown={startDrag}
              className="h-7 shrink-0 flex items-center justify-center border-b border-[#2a2a2d] cursor-grab active:cursor-grabbing bg-neutral-950 select-none"
            >
              <div className="w-8 h-0.5 bg-[#444] rounded-full" />
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              {isAddNodeOpen && <AddNodeSidebar />}
              {isAgentPickerOpen && <AgentPicker />}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
