import { useEffect, useState } from 'react';
import { Zap, GitBranch, Timer } from 'lucide-react';
import api from '@/lib/api';
import {
  ConfigSection,
  ConfigSelect,
  ToolHeader,
  GuardrailNote,
  NumberField,
} from '@nodes/agent_tool_panel/ToolKit.jsx';

const ACCENT = '#facc15';

export default function ToolCallWorkflowPanel({ config = {}, updateConfig }) {
  const [workflows, setWorkflows] = useState([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get('/api/automation?limit=50')
      .then((r) => {
        if (!alive) return;
        setWorkflows(r.data?.automations || []);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const options = workflows.map((w) => ({
    value: w._id,
    label: w.name || 'Untitled workflow',
  }));

  return (
    <ConfigSection>
      <ToolHeader
        icon={Zap}
        iconColor={ACCENT}
        title="Call Workflow"
        subtitle="Runs another one of your workflows"
      />

      <GuardrailNote>
        {config.workflowId
          ? 'Pinned to one workflow — the agent can pass a payload but cannot switch targets.'
          : 'No workflow pinned, so the agent decides which one to run by id. Pick one below to lock it.'}
      </GuardrailNote>

      <ConfigSelect
        label="Workflow"
        icon={GitBranch}
        searchable
        accentColor={ACCENT}
        value={config.workflowId || ''}
        onChange={(v) => updateConfig('workflowId', v)}
        options={options}
        placeholder={failed ? 'Could not load workflows' : 'Any workflow (agent decides)'}
        emptyLabel={failed ? 'Could not load workflows' : 'No workflows yet'}
      />

      <NumberField
        label="Timeout (ms)"
        icon={Timer}
        value={config.timeoutMs}
        onChange={(v) => updateConfig('timeoutMs', v)}
        placeholder="10000"
        hint="Time to accept the trigger. The workflow itself keeps running past this."
      />
    </ConfigSection>
  );
}
