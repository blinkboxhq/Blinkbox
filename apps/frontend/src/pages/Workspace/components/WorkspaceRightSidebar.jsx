import { AnimatePresence } from 'framer-motion';
import useWorkspaceStore from '../../../store/workspaceStore';
import TriggerPicker from './TriggerPicker';
import AddNodeSidebar from './AddNodeSidebar';
import AgentPicker from './AgentPicker';

export default function WorkspaceRightSidebar() {
  const isTriggerPickerOpen = useWorkspaceStore(s => s.isTriggerPickerOpen);
  const isAddNodeOpen       = useWorkspaceStore(s => s.isAddNodeOpen);
  const isAgentPickerOpen   = useWorkspaceStore(s => s.isAgentPickerOpen);

  return (
    <>
      {/* TriggerPicker — full-screen centered modal */}
      <AnimatePresence>
        {isTriggerPickerOpen && <TriggerPicker />}
      </AnimatePresence>

      {/* AddNodeSidebar — full-screen centered modal */}
      <AnimatePresence>
        {isAddNodeOpen && <AddNodeSidebar />}
      </AnimatePresence>

      {/* AgentPicker — full-screen centered modal */}
      <AnimatePresence>
        {isAgentPickerOpen && <AgentPicker />}
      </AnimatePresence>
    </>
  );
}
