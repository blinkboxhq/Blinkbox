import imgAsana from './logo.svg';
import {
  Plus, Pencil, CheckCircle2, Eye, List, MessageSquarePlus, FolderPlus, FolderKanban,
  Trash2, Search, ListPlus, ListTree, Link2, Unlink, Tag, Tags, UserPlus, UserMinus,
  Users, User, MessagesSquare, Copy, FolderX, Building2, GitBranch,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigBanner, ConfigToggleRow,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'createTask',           label: 'Create Task',            icon: Plus,              desc: 'Tasks' },
  { value: 'updateTask',           label: 'Update Task',            icon: Pencil,            desc: 'Tasks' },
  { value: 'completeTask',         label: 'Complete Task',          icon: CheckCircle2,      desc: 'Tasks' },
  { value: 'deleteTask',           label: 'Delete Task',            icon: Trash2,            desc: 'Tasks' },
  { value: 'getTask',              label: 'Get Task',               icon: Eye,               desc: 'Tasks' },
  { value: 'listTasks',            label: 'List Tasks',             icon: List,              desc: 'Tasks' },
  { value: 'searchTasks',          label: 'Search Tasks',           icon: Search,            desc: 'Tasks' },
  { value: 'createSubtask',        label: 'Create Subtask',         icon: ListPlus,          desc: 'Tasks' },
  { value: 'listSubtasks',         label: 'List Subtasks',          icon: ListTree,          desc: 'Tasks' },
  { value: 'setDependencies',      label: 'Set Dependencies',       icon: GitBranch,         desc: 'Tasks' },
  { value: 'addComment',           label: 'Add Comment',            icon: MessageSquarePlus, desc: 'Comments' },
  { value: 'listComments',         label: 'List Comments',          icon: MessagesSquare,    desc: 'Comments' },
  { value: 'getStory',             label: 'Get Comment',            icon: Eye,               desc: 'Comments' },
  { value: 'updateStory',          label: 'Update Comment',         icon: Pencil,            desc: 'Comments' },
  { value: 'deleteStory',          label: 'Delete Comment',         icon: Trash2,            desc: 'Comments' },
  { value: 'addToProject',         label: 'Add Task to Project',    icon: Link2,             desc: 'Task Links' },
  { value: 'removeFromProject',    label: 'Remove from Project',    icon: Unlink,            desc: 'Task Links' },
  { value: 'addTaskToSection',     label: 'Add Task to Section',    icon: Link2,             desc: 'Task Links' },
  { value: 'addTag',               label: 'Add Tag to Task',        icon: Tag,               desc: 'Task Links' },
  { value: 'removeTag',            label: 'Remove Tag from Task',   icon: Tag,               desc: 'Task Links' },
  { value: 'addFollowers',         label: 'Add Followers',          icon: UserPlus,          desc: 'Task Links' },
  { value: 'removeFollowers',      label: 'Remove Followers',       icon: UserMinus,         desc: 'Task Links' },
  { value: 'createProject',        label: 'Create Project',         icon: FolderPlus,        desc: 'Projects' },
  { value: 'updateProject',        label: 'Update Project',         icon: Pencil,            desc: 'Projects' },
  { value: 'deleteProject',        label: 'Delete Project',         icon: FolderX,           desc: 'Projects' },
  { value: 'duplicateProject',     label: 'Duplicate Project',      icon: Copy,              desc: 'Projects' },
  { value: 'getProject',           label: 'Get Project',            icon: Eye,               desc: 'Projects' },
  { value: 'listProjects',         label: 'List Projects',          icon: FolderKanban,      desc: 'Projects' },
  { value: 'addProjectMembers',    label: 'Add Project Members',    icon: UserPlus,          desc: 'Projects' },
  { value: 'removeProjectMembers', label: 'Remove Project Members', icon: UserMinus,         desc: 'Projects' },
  { value: 'createSection',        label: 'Create Section',         icon: Plus,              desc: 'Sections' },
  { value: 'updateSection',        label: 'Update Section',         icon: Pencil,            desc: 'Sections' },
  { value: 'deleteSection',        label: 'Delete Section',         icon: Trash2,            desc: 'Sections' },
  { value: 'listSections',         label: 'List Sections',          icon: List,              desc: 'Sections' },
  { value: 'createTag',            label: 'Create Tag',             icon: Plus,              desc: 'Tags' },
  { value: 'getTag',               label: 'Get Tag',                icon: Eye,               desc: 'Tags' },
  { value: 'deleteTag',            label: 'Delete Tag',             icon: Trash2,            desc: 'Tags' },
  { value: 'listTags',             label: 'List Tags',              icon: Tags,              desc: 'Tags' },
  { value: 'listTeams',            label: 'List Teams',             icon: Users,             desc: 'Teams & Users' },
  { value: 'getTeam',              label: 'Get Team',               icon: Eye,               desc: 'Teams & Users' },
  { value: 'listTeamUsers',        label: 'List Team Users',        icon: Users,             desc: 'Teams & Users' },
  { value: 'getMe',                label: 'My Profile',             icon: User,              desc: 'Teams & Users' },
  { value: 'getUser',              label: 'Get User',               icon: User,              desc: 'Teams & Users' },
  { value: 'listUsers',            label: 'List Users',             icon: Users,             desc: 'Teams & Users' },
  { value: 'listWorkspaces',       label: 'List Workspaces',        icon: Building2,         desc: 'Workspaces' },
  { value: 'getWorkspace',         label: 'Get Workspace',          icon: Building2,         desc: 'Workspaces' },
];

const TASK_GID_OPS = ['updateTask', 'completeTask', 'deleteTask', 'getTask', 'createSubtask', 'listSubtasks', 'setDependencies', 'addComment', 'listComments', 'addToProject', 'removeFromProject', 'addTaskToSection', 'addTag', 'removeTag', 'addFollowers', 'removeFollowers'];
const PROJECT_GID_OPS = ['getProject', 'updateProject', 'deleteProject', 'duplicateProject', 'addProjectMembers', 'removeProjectMembers', 'listSections', 'createSection', 'addToProject', 'removeFromProject'];
const SECTION_GID_OPS = ['updateSection', 'deleteSection', 'addTaskToSection'];
const TAG_GID_OPS = ['getTag', 'deleteTag', 'addTag', 'removeTag'];
const STORY_GID_OPS = ['getStory', 'updateStory', 'deleteStory'];
const WORKSPACE_REQ_OPS = ['searchTasks', 'createTag', 'listTeams', 'getWorkspace'];
const WORKSPACE_OPT_OPS = ['listTasks', 'listProjects', 'listTags', 'listUsers', 'createTask', 'createProject'];
const FOLLOWER_OPS = ['addFollowers', 'removeFollowers'];
const MEMBER_OPS = ['addProjectMembers', 'removeProjectMembers'];
const LIMIT_OPS = ['listTasks', 'searchTasks', 'listProjects'];
const TASK_BODY_OPS = ['createTask', 'updateTask', 'createSubtask'];

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
      <ConfigHeader logoUrl={imgAsana} title="Asana" subtitle={currentOp?.label || 'Tasks, projects, comments, teams'} />

      <ConfigSelect
        label="Operation"
        value={op}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {TASK_GID_OPS.includes(op) &&
        text(op === 'createSubtask' ? 'Parent Task GID' : 'Task GID', 'taskGid', { placeholder: '{{ $json.gid }}' })}

      {PROJECT_GID_OPS.includes(op) &&
        text('Project GID', 'projectGid', { placeholder: 'Project GID from Asana URL' })}

      {SECTION_GID_OPS.includes(op) &&
        text('Section GID', 'sectionGid', { placeholder: '{{ $json.section.gid }}' })}

      {op === 'addToProject' &&
        text('Section GID', 'sectionGid', { optional: true, placeholder: 'Place task in this section' })}

      {TAG_GID_OPS.includes(op) &&
        text('Tag GID', 'tagGid', { placeholder: '{{ $json.tag.gid }}' })}

      {STORY_GID_OPS.includes(op) &&
        text('Comment (Story) GID', 'storyGid', { placeholder: '{{ $json.story.gid }}' })}

      {TASK_BODY_OPS.includes(op) && (
        <>
          {text(op === 'createSubtask' ? 'Subtask Name' : 'Task Name', 'name', { optional: op === 'updateTask', placeholder: 'Follow up with {{ $json.contact }}' })}
          {text('Notes', 'notes', { optional: true, placeholder: 'Additional context...', multiline: true })}
          {op === 'createTask' &&
            text('Project GID(s), comma-sep', 'projectGid', { optional: true, placeholder: 'Project GID from Asana URL' })}
          {text('Due Date (YYYY-MM-DD)', 'dueOn', { optional: true, placeholder: '{{ $json.deadline }}' })}
          {text('Start Date (YYYY-MM-DD)', 'startOn', { optional: true, placeholder: '2026-08-01' })}
          {text('Assignee (GID or email)', 'assignee', { optional: true, placeholder: 'me or {{ $json.assigneeEmail }}' })}
        </>
      )}

      {op === 'listTasks' && (
        <>
          {text('Project GID', 'projectGid', { optional: true, placeholder: 'Or use assignee + workspace below' })}
          {text('Assignee', 'assignee', { optional: true, placeholder: 'me or user GID' })}
        </>
      )}

      {op === 'searchTasks' && (
        <>
          {text('Search Text', 'text', { optional: true, placeholder: 'invoice' })}
          {text('Project GID', 'projectGid', { optional: true, placeholder: 'Filter by project' })}
          {text('Assignee', 'assignee', { optional: true, placeholder: 'me or user GID' })}
        </>
      )}

      {op === 'addComment' && (
        <>
          {text('Comment Text', 'text', { placeholder: '{{ $json.note }}', multiline: true })}
          <ConfigToggleRow
            label="HTML text"
            on={!!config.isHtml}
            onChange={(v) => updateConfig('isHtml', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {op === 'updateStory' &&
        text('New Text', 'text', { placeholder: 'Updated comment...', multiline: true })}

      {FOLLOWER_OPS.includes(op) &&
        text('Follower GIDs (comma-sep)', 'followers', { placeholder: 'gid1, gid2' })}

      {op === 'setDependencies' &&
        text('Dependency Task GIDs (comma-sep)', 'dependencies', { placeholder: 'gid1, gid2' })}

      {MEMBER_OPS.includes(op) &&
        text('Member GIDs (comma-sep)', 'members', { placeholder: 'gid1, gid2' })}

      {(op === 'createProject' || op === 'updateProject') && (
        <>
          {text('Project Name', 'name', { optional: op === 'updateProject', placeholder: 'Q3 Campaign' })}
          {text('Notes', 'notes', { optional: true, placeholder: 'Project description...', multiline: true })}
          {text('Color', 'color', { optional: true, placeholder: 'light-green' })}
          {op === 'createProject' &&
            text('Team GID', 'teamGid', { optional: true, placeholder: 'Required if no workspace GID' })}
          {op === 'updateProject' && (
            <ConfigToggleRow
              label="Archived"
              on={!!config.archived}
              onChange={(v) => updateConfig('archived', v)}
              accentColor={ACCENT}
            />
          )}
        </>
      )}

      {op === 'duplicateProject' && (
        <>
          {text('New Project Name', 'name', { placeholder: 'Q3 Campaign (copy)' })}
          {text('Team GID', 'teamGid', { optional: true, placeholder: 'Team GID' })}
        </>
      )}

      {(op === 'createSection' || op === 'updateSection') &&
        text(op === 'createSection' ? 'Section Name' : 'New Section Name', 'name', { placeholder: 'In Review' })}

      {op === 'createTag' && (
        <>
          {text('Tag Name', 'name', { placeholder: 'Priority' })}
          {text('Color', 'color', { optional: true, placeholder: 'light-green' })}
        </>
      )}

      {['getTeam', 'listTeamUsers'].includes(op) &&
        text('Team GID', 'teamGid', { placeholder: '{{ $json.team.gid }}' })}

      {['listProjects', 'listUsers'].includes(op) &&
        text('Team GID', 'teamGid', { optional: true, placeholder: 'Filter by team' })}

      {op === 'getUser' &&
        text('User GID', 'userGid', { placeholder: '{{ $json.user.gid }}' })}

      {WORKSPACE_REQ_OPS.includes(op) &&
        text('Workspace GID', 'workspaceGid', { placeholder: 'Workspace GID' })}

      {WORKSPACE_OPT_OPS.includes(op) &&
        text('Workspace GID', 'workspaceGid', { optional: true, placeholder: 'Workspace GID' })}

      {LIMIT_OPS.includes(op) &&
        text('Limit', 'limit', { optional: true, placeholder: '50' })}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="rose"
        label="Asana Personal Access Token"
        placeholder="Select Asana credential..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">gid, name, permalink_url, completed, due_on</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
