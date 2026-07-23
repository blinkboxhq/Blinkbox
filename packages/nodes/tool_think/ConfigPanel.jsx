import { Brain } from 'lucide-react';
import { ConfigSection, ToolHeader, GuardrailNote } from '@nodes/agent_tool_panel/ToolKit.jsx';

const ACCENT = '#8b5cf6';

export default function ToolThinkPanel() {
  return (
    <ConfigSection>
      <ToolHeader
        icon={Brain}
        iconColor={ACCENT}
        title="Think"
        subtitle="A scratchpad for the agent"
      />

      <GuardrailNote>
        Gives the agent somewhere to reason out loud mid-task. It calls nothing and changes
        nothing — the thought is just recorded in the run history, which is what makes long
        tool chains readable when they go wrong.
      </GuardrailNote>

      <GuardrailNote>
        Nothing to configure. Connect it to an agent and it works.
      </GuardrailNote>
    </ConfigSection>
  );
}
