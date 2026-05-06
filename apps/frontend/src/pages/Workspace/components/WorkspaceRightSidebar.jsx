import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useWorkspaceStore from '../../../store/workspaceStore';
import TriggerPicker from './TriggerPicker';
import AddNodeSidebar from './AddNodeSidebar';
import AgentPicker from './AgentPicker';
import { playPanelOpen } from '../../../lib/sounds';

const springIn = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.8,
};

export default function WorkspaceRightSidebar({ width = 320, onResizeStart }) {
  const isTriggerPickerOpen = useWorkspaceStore(s => s.isTriggerPickerOpen);
  const isAddNodeOpen       = useWorkspaceStore(s => s.isAddNodeOpen);
  const isAgentPickerOpen   = useWorkspaceStore(s => s.isAgentPickerOpen);

  const isOpen = isTriggerPickerOpen || isAddNodeOpen || isAgentPickerOpen;
  const prevOpen = useRef(false);

  useEffect(() => {
    if (isOpen && !prevOpen.current) playPanelOpen();
    prevOpen.current = isOpen;
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          key="right-sidebar"
          initial={{ x: width, opacity: 0.4 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: width, opacity: 0 }}
          transition={springIn}
          className="absolute top-0 right-0 h-full flex flex-row bg-neutral-950 border-l border-[#333] z-20 will-change-transform"
          style={{ width }}
        >
          {/* Drag handle */}
          <div
            onMouseDown={onResizeStart}
            className="w-1 shrink-0 cursor-col-resize hover:bg-violet-500/30 active:bg-violet-500/40 transition-colors border-r border-[#2a2a2d] group"
          >
            <div className="w-0.5 h-8 bg-[#444] group-hover:bg-violet-400 rounded-full mx-auto mt-[calc(50%-16px)] transition-colors" />
          </div>

          {/* Panel content — fades in slightly after the slide */}
          <motion.div
            className="flex-1 flex flex-col overflow-hidden"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.04, duration: 0.18, ease: "easeOut" }}
          >
            {isTriggerPickerOpen && <TriggerPicker />}
            {isAddNodeOpen && <AddNodeSidebar />}
            {isAgentPickerOpen && <AgentPicker />}
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
