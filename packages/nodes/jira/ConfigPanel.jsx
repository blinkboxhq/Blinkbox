import { useEffect } from 'react';
import imgJira from './logo.svg';
import {
  Search, Eye, Plus, Pencil, Trash2, UserCheck, ArrowRightLeft,
  List, MessageSquarePlus, MessagesSquare, MessageSquareX, Link2, Link,
  Users, Clock, ListChecks, FolderKanban, Folder, Activity, Layers,
  Component, User, UserSearch, CircleDot, Flag, SlidersHorizontal,
  LayoutDashboard, Repeat, MoveRight, Pencil as PencilIcon,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigInput, ConfigPills, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';
const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

const OPERATIONS = [
  { value: 'searchIssues', label: 'Search (JQL)', icon: Search, desc: 'Issues' },
  { value: 'getIssue', label: 'Get Issue', icon: Eye, desc: 'Issues' },
  { value: 'createIssue', label: 'Create Issue', icon: Plus, desc: 'Issues' },
  { value: 'updateIssue', label: 'Update Issue', icon: Pencil, desc: 'Issues' },
  { value: 'deleteIssue', label: 'Delete Issue', icon: Trash2, desc: 'Issues' },
  { value: 'assignIssue', label: 'Assign Issue', icon: UserCheck, desc: 'Issues' },
  { value: 'transitionIssue', label: 'Transition', icon: ArrowRightLeft, desc: 'Transitions' },
  { value: 'listTransitions', label: 'List Transitions', icon: List, desc: 'Transitions' },
  { value: 'addComment', label: 'Add Comment', icon: MessageSquarePlus, desc: 'Comments' },
  { value: 'getComments', label: 'Get Comments', icon: MessagesSquare, desc: 'Comments' },
  { value: 'updateComment', label: 'Update Comment', icon: PencilIcon, desc: 'Comments' },
  { value: 'deleteComment', label: 'Delete Comment', icon: MessageSquareX, desc: 'Comments' },
  { value: 'linkIssues', label: 'Link Issues', icon: Link2, desc: 'Links' },
  { value: 'listLinkTypes', label: 'Link Types', icon: Link, desc: 'Links' },
  { value: 'addWatcher', label: 'Add Watcher', icon: Eye, desc: 'Watchers' },
  { value: 'getWatchers', label: 'Get Watchers', icon: Users, desc: 'Watchers' },
  { value: 'addWorklog', label: 'Add Worklog', icon: Clock, desc: 'Work' },
  { value: 'getWorklogs', label: 'Get Worklogs', icon: ListChecks, desc: 'Work' },
  { value: 'listProjects', label: 'List Projects', icon: FolderKanban, desc: 'Projects' },
  { value: 'getProject', label: 'Get Project', icon: Folder, desc: 'Projects' },
  { value: 'getProjectStatuses', label: 'Statuses', icon: Activity, desc: 'Projects' },
  { value: 'listVersions', label: 'List Versions', icon: Layers, desc: 'Projects' },
  { value: 'createVersion', label: 'Create Version', icon: Plus, desc: 'Projects' },
  { value: 'listComponents', label: 'Components', icon: Component, desc: 'Projects' },
  { value: 'listIssueTypes', label: 'Issue Types', icon: CircleDot, desc: 'Metadata' },
  { value: 'listPriorities', label: 'Priorities', icon: Flag, desc: 'Metadata' },
  { value: 'getFields', label: 'Fields', icon: SlidersHorizontal, desc: 'Metadata' },
  { value: 'getCurrentUser', label: 'My Profile', icon: User, desc: 'Users' },
  { value: 'searchUsers', label: 'Search Users', icon: UserSearch, desc: 'Users' },
  { value: 'listBoards', label: 'List Boards', icon: LayoutDashboard, desc: 'Boards' },
  { value: 'getBoardIssues', label: 'Board Issues', icon: List, desc: 'Boards' },
  { value: 'listSprints', label: 'List Sprints', icon: Repeat, desc: 'Sprints' },
  { value: 'createSprint', label: 'Create Sprint', icon: Plus, desc: 'Sprints' },
  { value: 'moveIssuesToSprint', label: 'Move to Sprint', icon: MoveRight, desc: 'Sprints' },
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

export default function JiraNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const op = LABEL_TO_OP[config.selectedAction] || config.operation || 'searchIssues';

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

      <ConfigInput
        label="Jira Domain"
        value={config.domain || ''}
        onChange={(val) => updateConfig('domain', val)}
        placeholder="mycompany.atlassian.net"
      />


      {op === 'searchIssues' &&
        text('JQL Query', 'jql', { placeholder: 'project = MYPROJ AND status = "To Do" ORDER BY created DESC', multiline: true })}

      {['getIssue', 'updateIssue', 'deleteIssue', 'assignIssue', 'transitionIssue', 'listTransitions', 'addComment', 'getComments', 'updateComment', 'deleteComment', 'addWatcher', 'getWatchers', 'addWorklog', 'getWorklogs'].includes(op) &&
        text('Issue Key', 'issueKey', { placeholder: 'PROJ-123' })}

      {(op === 'createIssue' || op === 'updateIssue') && (
        <>
          {op === 'createIssue' && (
            <>
              {text('Project Key', 'project', { placeholder: 'PROJ' })}
              <ConfigInput
                label="Issue Type"
                value={config.issueType || 'Task'}
                onChange={(val) => updateConfig('issueType', val)}
                placeholder="Task"
              />
            </>
          )}
          {text('Summary', 'summary', { placeholder: '{{n1.title}}' })}
          {text('Description', 'description', { placeholder: '{{n1.body}}', multiline: true })}
          {text('Assignee Account ID', 'assignee', { optional: true, placeholder: '5b10 ...' })}
          {text('Labels', 'labels', { placeholder: 'backend, urgent' })}
          {text('Due Date', 'dueDate', { optional: true, placeholder: '2026-07-15' })}
          <ConfigPills
            label="Priority"
            value={config.priority}
            onChange={(val) => updateConfig('priority', val)}
            options={PRIORITIES}
            accentColor={ACCENT}
          />
        </>
      )}

      {op === 'createIssue' &&
        text('Parent Key', 'parent', { optional: true, placeholder: 'PROJ-100' })}

      {op === 'deleteIssue' && (
        <ConfigBanner tone="warn">
          Permanently deletes the issue. Subtasks are kept unless toggled below.
        </ConfigBanner>
      )}

      {op === 'assignIssue' &&
        text('Assignee Account ID', 'assignee', { optional: true, placeholder: '5b10 ...' })}

      {op === 'transitionIssue' && (
        <>
          {text('Transition ID', 'transitionId', { placeholder: '21' })}
          {text('Comment', 'comment', { optional: true, placeholder: 'Moving to done', multiline: true })}
        </>
      )}

      {op === 'addComment' &&
        text('Comment', 'comment', { placeholder: '{{n1.message}}', multiline: true })}

      {(op === 'updateComment' || op === 'deleteComment') &&
        text('Comment ID', 'commentId', { placeholder: '10001' })}

      {op === 'updateComment' &&
        text('New Comment', 'comment', { placeholder: 'Updated text', multiline: true })}

      {op === 'linkIssues' && (
        <>
          {text('Link Type', 'linkType', { placeholder: 'Relates' })}
          {text('Inward Issue', 'inwardIssue', { placeholder: 'PROJ-1' })}
          {text('Outward Issue', 'outwardIssue', { placeholder: 'PROJ-2' })}
        </>
      )}

      {op === 'addWatcher' &&
        text('Account ID', 'accountId', { placeholder: '5b10 ...' })}

      {op === 'addWorklog' && (
        <>
          {text('Time Spent', 'timeSpent', { placeholder: '1h 30m' })}
          {text('Comment', 'comment', { optional: true, placeholder: 'Investigated bug', multiline: true })}
          {text('Started', 'started', { optional: true, placeholder: '2026-06-30T10:00:00.000+0000' })}
        </>
      )}

      {['listProjects', 'searchUsers'].includes(op) &&
        text('Query', 'query', { optional: true, placeholder: 'search text' })}

      {['getProject', 'getProjectStatuses', 'listVersions', 'listComponents', 'listBoards'].includes(op) &&
        text('Project Key', 'project', { placeholder: 'PROJ' })}

      {op === 'createVersion' && (
        <>
          {text('Project ID', 'projectId', { placeholder: '10000' })}
          {text('Version Name', 'name', { placeholder: '1.2.0' })}
          {text('Description', 'description', { optional: true, placeholder: 'Q3 release' })}
          {text('Release Date', 'releaseDate', { optional: true, placeholder: '2026-09-01' })}
        </>
      )}

      {op === 'searchUsers' &&
        text('Search Query', 'query', { placeholder: 'jane@example.com' })}

      {['getBoardIssues', 'listSprints', 'createSprint'].includes(op) &&
        text('Board ID', 'boardId', { placeholder: '42' })}

      {op === 'listSprints' &&
        text('Sprint State', 'sprintState', { optional: true, placeholder: 'active' })}

      {op === 'createSprint' && (
        <>
          {text('Sprint Name', 'name', { placeholder: 'Sprint 12' })}
          {text('Start Date', 'startDate', { optional: true, placeholder: '2026-07-01T00:00:00.000Z' })}
          {text('End Date', 'endDate', { optional: true, placeholder: '2026-07-14T00:00:00.000Z' })}
          {text('Goal', 'goal', { optional: true, placeholder: 'Ship billing v2' })}
        </>
      )}

      {op === 'moveIssuesToSprint' && (
        <>
          {text('Sprint ID', 'sprintId', { placeholder: '123' })}
          {text('Issue Keys', 'issueKeys', { placeholder: 'PROJ-1, PROJ-2' })}
        </>
      )}

      {['searchIssues', 'getComments', 'getWorklogs', 'listProjects', 'listBoards', 'getBoardIssues', 'listSprints', 'searchUsers'].includes(op) && (
        <ConfigInput
          label="Limit"
          type="number"
          value={config.limit ?? 20}
          onChange={(val) => updateConfig('limit', Number(val))}
          hint="Max results (1–100)"
        />
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Jira API Token (email:token)"
        placeholder="Select Jira credential..."
      />
    </ConfigSection>
  );
}
