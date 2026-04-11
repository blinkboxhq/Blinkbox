import useWorkspaceStore from '../../../store/workspaceStore';
import TriggerPicker from './TriggerPicker';
import AddNodeSidebar from './AddNodeSidebar';

export default function WorkspaceRightSidebar() {
  const isTriggerPickerOpen = useWorkspaceStore((state) => state.isTriggerPickerOpen);
  const isAddNodeOpen = useWorkspaceStore((state) => state.isAddNodeOpen);

  if (!isTriggerPickerOpen && !isAddNodeOpen) return null;

  return (
    <aside className="w-[320px] h-full bg-zinc-950 border-l border-zinc-800/60 flex flex-col z-20">
      {isTriggerPickerOpen && <TriggerPicker />}
      {isAddNodeOpen && <AddNodeSidebar />}
    </aside>
  );
}
