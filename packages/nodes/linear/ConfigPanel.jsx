import imgLinear from './logo.svg';
import {
  Plus, FileText, Pencil, Archive, List, Search, UserPlus, Workflow, Bell,
  MessageSquare, MessagesSquare, Tag, Tags, FolderKanban, FolderPlus, FolderOpen,
  Flag, RefreshCw, Users, User, UserCircle, Link2,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigInput, ConfigPills,
} from '@/components/ui/ConfigKit';

const ACCENT = '#5E6AD2';

const OPERATIONS = [
  { value: 'createIssue', label: 'Create Issue', icon: Plus, desc: 'Issues' },
  { value: 'getIssue', label: 'Get Issue', icon: FileText, desc: 'Issues' },
  { value: 'updateIssue', label: 'Update Issue', icon: Pencil, desc: 'Issues' },
  { value: 'archiveIssue', label: 'Archive Issue', icon: Archive, desc: 'Issues' },
  { value: 'listIssues', label: 'List Issues', icon: List, desc: 'Issues' },
  { value: 'searchIssues', label: 'Search Issues', icon: Search, desc: 'Issues' },
  { value: 'assignIssue', label: 'Assign Issue', icon: UserPlus, desc: 'Issues' },
  { value: 'setIssueState', label: 'Set State', icon: Workflow, desc: 'Issues' },
  { value: 'subscribeToIssue', label: 'Subscribe', icon: Bell, desc: 'Issues' },
  { value: 'createComment', label: 'Create Comment', icon: MessageSquare, desc: 'Comments' },
  { value: 'listComments', label: 'List Comments', icon: MessagesSquare, desc: 'Comments' },
  { value: 'listLabels', label: 'List Labels', icon: Tags, desc: 'Labels' },
  { value: 'createLabel', label: 'Create Label', icon: Tag, desc: 'Labels' },
  { value: 'addLabelToIssue', label: 'Add Label', icon: Tag, desc: 'Labels' },
  { value: 'createProject', label: 'Create Project', icon: FolderPlus, desc: 'Projects' },
  { value: 'getProject', label: 'Get Project', icon: FolderOpen, desc: 'Projects' },
  { value: 'updateProject', label: 'Update Project', icon: Pencil, desc: 'Projects' },
  { value: 'listProjects', label: 'List Projects', icon: FolderKanban, desc: 'Projects' },
  { value: 'listProjectMilestones', label: 'List Milestones', icon: Flag, desc: 'Milestones' },
  { value: 'createProjectMilestone', label: 'Add Milestone', icon: Flag, desc: 'Milestones' },
  { value: 'listCycles', label: 'List Cycles', icon: RefreshCw, desc: 'Cycles' },
  { value: 'listTeams', label: 'List Teams', icon: Users, desc: 'Teams' },
  { value: 'getTeam', label: 'Get Team', icon: Users, desc: 'Teams' },
  { value: 'listTeamStates', label: 'Team States', icon: Workflow, desc: 'Teams' },
  { value: 'listTeamMembers', label: 'Team Members', icon: Users, desc: 'Teams' },
  { value: 'listUsers', label: 'List Users', icon: User, desc: 'Users' },
  { value: 'getViewer', label: 'Get Viewer (Me)', icon: UserCircle, desc: 'Users' },
  { value: 'createAttachment', label: 'Create Attachment', icon: Link2, desc: 'Users' },
];

const PRIORITIES = [
  { value: '0', label: 'None' },
  { value: '1', label: 'Urgent' },
  { value: '2', label: 'High' },
  { value: '3', label: 'Medium' },
  { value: '4', label: 'Low' },
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

export default function LinearConfigPanel({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || 'listIssues';
  const currentOp = OPERATIONS.find((o) => o.value === op);
  const show = (...ops) => ops.includes(op);

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
      <ConfigHeader logoUrl={imgLinear} title="Linear" subtitle={currentOp?.label || 'Issues, projects, cycles & teams'} />

      <Field label="Credential">
        <CredentialPicker
          provider="linear"
          value={config.credentialId || ''}
          onChange={(id) => updateConfig('credentialId', id)}
          accentColor={ACCENT}
        />
      </Field>

      <ConfigSelect
        label="Operation"
        value={op}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {show('createIssue', 'listIssues', 'createProject', 'listCycles', 'getTeam', 'listTeamStates', 'listTeamMembers') &&
        text(
          show('createProject') ? 'Team IDs (comma-separated)' : 'Team ID',
          show('createProject') ? 'teamIds' : 'teamId',
          { placeholder: '9cfb...  /  {{ $json.teamId }}' },
        )}

      {show('getIssue', 'updateIssue', 'archiveIssue', 'assignIssue', 'setIssueState', 'subscribeToIssue', 'createComment', 'listComments', 'addLabelToIssue', 'createAttachment') &&
        text('Issue ID / Identifier', 'issueId', { placeholder: 'ENG-123  /  {{ $json.identifier }}' })}

      {show('searchIssues') &&
        text('Search Term', 'query', { placeholder: 'login bug' })}

      {show('createIssue', 'updateIssue') && (
        <>
          {text('Title', 'title', { placeholder: 'Fix the login redirect' })}
          {text('Description', 'description', { placeholder: 'Steps to reproduce…', multiline: true })}
          <ConfigPills
            label="Priority"
            value={String(config.priority || '0')}
            onChange={(val) => updateConfig('priority', val)}
            options={PRIORITIES}
            accentColor={ACCENT}
          />
          {text('State ID', 'stateId', { optional: true, placeholder: 'state UUID' })}
          {text('Assignee ID', 'assigneeId', { optional: true, placeholder: 'user UUID' })}
          {text('Project ID', 'projectId', { optional: true, placeholder: 'project UUID' })}
        </>
      )}

      {show('createIssue') && (
        <>
          {text('Parent Issue ID', 'parentId', { optional: true, placeholder: 'parent UUID' })}
          {text('Label IDs', 'labelIds', { optional: true, placeholder: 'id1, id2' })}
          {text('Due Date', 'dueDate', { optional: true, placeholder: '2026-07-15' })}
        </>
      )}

      {show('assignIssue', 'subscribeToIssue') &&
        text(
          show('subscribeToIssue') ? 'User ID (subscriber)' : 'Assignee ID',
          show('subscribeToIssue') ? 'userId' : 'assigneeId',
          { placeholder: 'user UUID' },
        )}

      {show('setIssueState') &&
        text('State ID', 'stateId', { placeholder: 'state UUID' })}

      {show('createComment') &&
        text('Comment Body', 'body', { placeholder: 'Thanks for the report — looking into it.', multiline: true })}

      {show('createLabel') && (
        <>
          {text('Label Name', 'name', { placeholder: 'bug' })}
          {text('Team ID', 'teamId', { optional: true, placeholder: 'team UUID' })}
          {text('Color', 'color', { optional: true, placeholder: '#5E6AD2' })}
        </>
      )}

      {show('addLabelToIssue') &&
        text('Label IDs', 'labelIds', { placeholder: 'id1, id2' })}

      {show('createProject', 'updateProject') && (
        <>
          {text('Project Name', 'name', { placeholder: 'Q3 Launch' })}
          {text('Description', 'description', { optional: true, placeholder: 'Goals and scope…', multiline: true })}
          {text('State', 'state', { optional: true, placeholder: 'started' })}
          {text('Target Date', 'targetDate', { optional: true, placeholder: '2026-09-30' })}
        </>
      )}

      {show('getProject', 'updateProject', 'listProjectMilestones', 'createProjectMilestone') &&
        text('Project ID', 'projectId', { placeholder: 'project UUID' })}

      {show('createProjectMilestone') && (
        <>
          {text('Milestone Name', 'name', { placeholder: 'Beta' })}
          {text('Target Date', 'targetDate', { optional: true, placeholder: '2026-08-15' })}
        </>
      )}

      {show('createAttachment') && (
        <>
          {text('URL', 'url', { placeholder: 'https://example.com/spec.pdf' })}
          {text('Title', 'title', { optional: true, placeholder: 'Spec document' })}
        </>
      )}

      {show('listIssues', 'searchIssues', 'listProjects', 'listLabels', 'listUsers') && (
        <ConfigInput
          label="Limit"
          type="number"
          value={config.limit ?? 25}
          onChange={(val) => updateConfig('limit', val)}
          hint="Max results (1–100)"
        />
      )}
    </ConfigSection>
  );
}
