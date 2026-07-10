import imgClickUp from './logo.svg';
import {
  Plus, Pencil, Trash2, Eye, List, MessageSquarePlus, FolderPlus, Layers, Folder, ListChecks,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'createTask',   label: 'Create Task',   icon: Plus },
  { value: 'updateTask',   label: 'Update Task',   icon: Pencil },
  { value: 'deleteTask',   label: 'Delete Task',   icon: Trash2 },
  { value: 'getTask',      label: 'Get Task',      icon: Eye },
  { value: 'listTasks',    label: 'List Tasks',    icon: List },
  { value: 'addComment',   label: 'Add Comment',   icon: MessageSquarePlus },
  { value: 'createFolder', label: 'Create Folder', icon: FolderPlus },
  { value: 'listSpaces',   label: 'List Spaces',   icon: Layers },
  { value: 'listFolders',  label: 'List Folders',  icon: Folder },
  { value: 'listLists',    label: 'List Lists',    icon: ListChecks },
];

const PRIORITIES = [
  { value: 1, label: 'Urgent' },
  { value: 2, label: 'High' },
  { value: 3, label: 'Normal' },
  { value: 4, label: 'Low' },
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

export default function ClickUpNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || 'createTask';
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
      <ConfigHeader logoUrl={imgClickUp} title="ClickUp" subtitle={currentOp?.label || 'Tasks, lists, folders, comments'} />

      <ConfigSelect
        label="Operation"
        value={op}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {['createTask', 'listTasks'].includes(op) &&
        text('List ID', 'listId', { placeholder: 'ClickUp list ID' })}

      {['updateTask', 'deleteTask', 'getTask', 'addComment'].includes(op) &&
        text('Task ID', 'taskId', { placeholder: '{{ $json.id }}' })}

      {(op === 'createTask' || op === 'updateTask') && (
        <>
          {text('Task Name', 'name', { placeholder: 'Review {{ $json.client }} contract' })}
          {text('Description', 'description', { placeholder: 'Task details...', multiline: true })}
          <ConfigPills
            label="Priority"
            value={config.priority}
            onChange={(val) => updateConfig('priority', val)}
            options={PRIORITIES}
            accentColor={ACCENT}
          />
          {text('Due Date (timestamp or ISO)', 'dueDate', { placeholder: '{{ $json.deadline }}' })}
          {text('Assignees (user IDs, comma-sep)', 'assignees', { placeholder: '123,456' })}
        </>
      )}

      {op === 'addComment' &&
        text('Comment', 'comment', { placeholder: '{{ $json.note }}', multiline: true })}

      {op === 'createFolder' && (
        <>
          {text('Space ID', 'spaceId', { placeholder: 'ClickUp space ID' })}
          {text('Folder Name', 'name', { placeholder: 'Q3 Projects' })}
        </>
      )}

      {op === 'listSpaces' &&
        text('Team / Workspace ID', 'teamId', { placeholder: 'ClickUp team ID' })}

      {op === 'listFolders' &&
        text('Space ID', 'spaceId', { placeholder: '{{ $json.space.id }}' })}

      {op === 'listLists' &&
        text('Folder ID', 'folderId', { placeholder: '{{ $json.folder.id }}' })}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="violet"
        label="ClickUp API Token"
        placeholder="Select ClickUp credential..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">id, name, url, status, priority</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
