import { useEffect, useRef } from 'react';
import useWorkspaceStore from '../../../store/workspaceStore';
import TriggerPicker from './TriggerPicker';
import AddNodeSidebar from './AddNodeSidebar';
import AgentPicker from './AgentPicker';
import { playPanelOpen } from '../../../lib/sounds';

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

  if (!isOpen) return null;

  return (
    <aside className="h-full flex flex-row bg-zinc-950 border-l border-zinc-800/60 z-20" style={{ width }}>
      {/* Drag handle on left edge */}
      <div
        onMouseDown={onResizeStart}
        className="w-1 shrink-0 cursor-col-resize hover:bg-violet-500/30 active:bg-violet-500/40 transition-colors border-r border-zinc-800/40 group"
      >
        <div className="w-0.5 h-8 bg-zinc-700 group-hover:bg-violet-400 rounded-full mx-auto mt-[calc(50%-16px)] transition-colors" />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {isTriggerPickerOpen && <TriggerPicker />}
        {isAddNodeOpen && <AddNodeSidebar />}
        {isAgentPickerOpen && <AgentPicker />}
      </div>
    </aside>
  );
}
