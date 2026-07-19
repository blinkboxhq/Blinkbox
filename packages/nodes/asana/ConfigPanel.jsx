import { useEffect } from 'react';
import imgAsana from './logo.svg';
import {
  Plus, Pencil, CheckCircle2, Eye, List, MessageSquarePlus, FolderPlus, FolderKanban,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'createTask',    label: 'Create Task',    icon: Plus },
  { value: 'updateTask',    label: 'Update Task',    icon: Pencil },
  { value: 'completeTask',  label: 'Complete Task',  icon: CheckCircle2 },
  { value: 'getTask',       label: 'Get Task',       icon: Eye },
  { value: 'listTasks',     label: 'List Tasks',     icon: List },
  { value: 'addComment',    label: 'Add Comment',    icon: MessageSquarePlus },
  { value: 'createProject', label: 'Create Project', icon: FolderPlus },
  { value: 'listProjects',  label: 'List Projects',  icon: FolderKanban },
];

function Field({ label, optional, children }) {
  return (
    <div className="flex flex-col">
      {label && (
        <ConfigLabel>
          {label}{optional && <span className="text-neutral-700 normal-case tracking-normal"> (optional)</span>}
        </ConfigLabel>
      )}
      {children}
    </div>
  );
}

export default function AsanaNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const op = LABEL_TO_OP[config.selectedAction] || config.operation || 'createTask';

  useEffect(() => {
    if (op && op !== config.operation) updateConfig('operation', op);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op]);
  const currentOp = OPERATIONS.find((o) => o.value === op);

  const text = (label, key, opts = {}) => (
    <Field label={label} optional={opts.optional}>
      <SmartVariableInput
        value={config[key] || ''}
        onChange={(val) => updateConfig(key, val)}
        placeholder={opts.placeholder || ''}
        multiline={opts.multiline}
        nodeId={nodeId}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">


      {['updateTask', 'completeTask', 'getTask', 'addComment'].includes(op) &&
        text('Task GID', 'taskGid', { placeholder: '{{ $json.gid }}' })}

      {(op === 'createTask' || op === 'updateTask') && (
        <>
          {text('Task Name', 'name', { placeholder: 'Follow up with {{ $json.contact }}' })}
          {text('Notes', 'notes', { optional: true, placeholder: 'Additional context...', multiline: true })}
          {op === 'createTask' &&
            text('Project GID', 'projectGid', { placeholder: 'Project GID from Asana URL' })}
          {text('Due Date (YYYY-MM-DD)', 'dueOn', { placeholder: '{{ $json.deadline }}' })}
          {text('Assignee (GID or email)', 'assignee', { placeholder: 'me or {{ $json.assigneeEmail }}' })}
        </>
      )}

      {op === 'listTasks' &&
        text('Project GID', 'projectGid', { placeholder: 'Project GID' })}

      {op === 'addComment' &&
        text('Comment Text', 'text', { placeholder: '{{ $json.note }}', multiline: true })}

      {op === 'createProject' && (
        <>
          {text('Project Name', 'name', { placeholder: 'Q3 Campaign' })}
          {text('Team GID', 'teamGid', { placeholder: 'Team GID' })}
        </>
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Asana Personal Access Token"
        placeholder="Select Asana credential..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">gid, name, permalink_url, completed, due_on</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
