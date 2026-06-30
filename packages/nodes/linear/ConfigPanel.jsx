import {
  CircleDot, FileText, Pencil, Archive, List, Search, UserPlus, Workflow, Bell,
  MessageSquare, MessagesSquare, Tag, Tags, FolderKanban, FolderPlus, FolderOpen,
  Flag, RefreshCw, Users, User, UserCircle, Link2, Plus,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';

const ACCENT = '#5E6AD2';

const GROUPS = [
  {
    title: 'Issues',
    ops: [
      { value: 'createIssue', label: 'Create Issue', icon: Plus },
      { value: 'getIssue', label: 'Get Issue', icon: FileText },
      { value: 'updateIssue', label: 'Update Issue', icon: Pencil },
      { value: 'archiveIssue', label: 'Archive Issue', icon: Archive },
      { value: 'listIssues', label: 'List Issues', icon: List },
      { value: 'searchIssues', label: 'Search Issues', icon: Search },
      { value: 'assignIssue', label: 'Assign Issue', icon: UserPlus },
      { value: 'setIssueState', label: 'Set State', icon: Workflow },
      { value: 'subscribeToIssue', label: 'Subscribe', icon: Bell },
    ],
  },
  {
    title: 'Comments & Labels',
    ops: [
      { value: 'createComment', label: 'Create Comment', icon: MessageSquare },
      { value: 'listComments', label: 'List Comments', icon: MessagesSquare },
      { value: 'listLabels', label: 'List Labels', icon: Tags },
      { value: 'createLabel', label: 'Create Label', icon: Tag },
      { value: 'addLabelToIssue', label: 'Add Label', icon: Tag },
    ],
  },
  {
    title: 'Projects & Milestones',
    ops: [
      { value: 'createProject', label: 'Create Project', icon: FolderPlus },
      { value: 'getProject', label: 'Get Project', icon: FolderOpen },
      { value: 'updateProject', label: 'Update Project', icon: Pencil },
      { value: 'listProjects', label: 'List Projects', icon: FolderKanban },
      { value: 'listProjectMilestones', label: 'List Milestones', icon: Flag },
      { value: 'createProjectMilestone', label: 'Add Milestone', icon: Flag },
      { value: 'listCycles', label: 'List Cycles', icon: RefreshCw },
    ],
  },
  {
    title: 'Teams & Users',
    ops: [
      { value: 'listTeams', label: 'List Teams', icon: Users },
      { value: 'getTeam', label: 'Get Team', icon: Users },
      { value: 'listTeamStates', label: 'Team States', icon: Workflow },
      { value: 'listTeamMembers', label: 'Team Members', icon: Users },
      { value: 'listUsers', label: 'List Users', icon: User },
      { value: 'getViewer', label: 'Get Viewer (Me)', icon: UserCircle },
      { value: 'createAttachment', label: 'Create Attachment', icon: Link2 },
    ],
  },
];

const PRIORITIES = [
  { value: '0', label: 'None' },
  { value: '1', label: 'Urgent' },
  { value: '2', label: 'High' },
  { value: '3', label: 'Medium' },
  { value: '4', label: 'Low' },
];

const lbl = 'text-[10px] font-bold text-zinc-500 uppercase tracking-widest';
const inputCls =
  'w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#5E6AD2]/40';

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={lbl}>{label}</span>
      {children}
      {hint && <span className="text-[10px] text-zinc-600">{hint}</span>}
    </div>
  );
}

export default function LinearConfigPanel({ config = {}, updateConfig }) {
  const op = config.operation || 'listIssues';
  const set = (k) => (v) => updateConfig(k, v);

  const Var = ({ k, placeholder, multiline }) => (
    <SmartVariableInput
      value={config[k] || ''}
      onChange={set(k)}
      placeholder={placeholder}
      multiline={multiline}
      className={inputCls}
    />
  );

  const show = (...ops) => ops.includes(op);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#5E6AD2]/10 border border-[#5E6AD2]/25 flex items-center justify-center shrink-0">
          <CircleDot className="w-4 h-4 text-[#5E6AD2]" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Linear</div>
          <div className="text-[11px] text-zinc-500">Issues, projects, cycles & teams</div>
        </div>
      </div>

      <Field label="Credential">
        <CredentialPicker
          provider="linear"
          value={config.credentialId || ''}
          onChange={set('credentialId')}
          accentColor={ACCENT}
        />
      </Field>

      <div className="flex flex-col gap-3">
        <span className={lbl}>Operation</span>
        {GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{group.title}</span>
            <div className="grid grid-cols-2 gap-2">
              {group.ops.map((o) => {
                const Icon = o.icon;
                const active = op === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => updateConfig('operation', o.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all duration-150 ${
                      active
                        ? 'bg-[#5E6AD2]/10 border-[#5E6AD2]/40 text-[#8b93e8]'
                        : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] font-semibold truncate">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {show('createIssue', 'listIssues', 'createProject', 'listCycles', 'getTeam', 'listTeamStates', 'listTeamMembers') && (
        <Field label={show('createProject') ? 'Team IDs (comma-separated)' : 'Team ID'} hint="UUID of the team — use List Teams to find it.">
          <Var k={show('createProject') ? 'teamIds' : 'teamId'} placeholder="9cfb...  /  {{ $json.teamId }}" />
        </Field>
      )}

      {show('getIssue', 'updateIssue', 'archiveIssue', 'assignIssue', 'setIssueState', 'subscribeToIssue', 'createComment', 'listComments', 'addLabelToIssue', 'createAttachment') && (
        <Field label="Issue ID / Identifier" hint="UUID or human key like ENG-123.">
          <Var k="issueId" placeholder="ENG-123  /  {{ $json.identifier }}" />
        </Field>
      )}

      {show('searchIssues') && (
        <Field label="Search Term">
          <Var k="query" placeholder="login bug" />
        </Field>
      )}

      {show('createIssue', 'updateIssue') && (
        <>
          <Field label="Title">
            <Var k="title" placeholder="Fix the login redirect" />
          </Field>
          <Field label="Description" hint="Markdown supported.">
            <Var k="description" placeholder="Steps to reproduce…" multiline />
          </Field>
          <Field label="Priority">
            <div className="grid grid-cols-5 gap-1.5">
              {PRIORITIES.map((p) => {
                const active = String(config.priority || '0') === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => updateConfig('priority', p.value)}
                    className={`px-2 py-2 rounded-lg border text-[11px] font-semibold transition-all duration-150 ${
                      active
                        ? 'bg-[#5E6AD2]/10 border-[#5E6AD2]/40 text-[#8b93e8]'
                        : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="State ID" hint="Optional — workflow state UUID. Use List Team States.">
            <Var k="stateId" placeholder="state UUID" />
          </Field>
          <Field label="Assignee ID" hint="Optional — user UUID.">
            <Var k="assigneeId" placeholder="user UUID" />
          </Field>
          <Field label="Project ID" hint="Optional.">
            <Var k="projectId" placeholder="project UUID" />
          </Field>
        </>
      )}

      {show('createIssue') && (
        <>
          <Field label="Parent Issue ID" hint="Optional — set to create a sub-issue.">
            <Var k="parentId" placeholder="parent UUID" />
          </Field>
          <Field label="Label IDs" hint="Optional — comma-separated label UUIDs.">
            <Var k="labelIds" placeholder="id1, id2" />
          </Field>
          <Field label="Due Date" hint="Optional — YYYY-MM-DD.">
            <Var k="dueDate" placeholder="2026-07-15" />
          </Field>
        </>
      )}

      {show('assignIssue', 'subscribeToIssue') && (
        <Field label={show('subscribeToIssue') ? 'User ID (subscriber)' : 'Assignee ID'}>
          <Var k={show('subscribeToIssue') ? 'userId' : 'assigneeId'} placeholder="user UUID" />
        </Field>
      )}

      {show('setIssueState') && (
        <Field label="State ID" hint="Workflow state UUID. Use List Team States to find it.">
          <Var k="stateId" placeholder="state UUID" />
        </Field>
      )}

      {show('createComment') && (
        <Field label="Comment Body" hint="Markdown supported.">
          <Var k="body" placeholder="Thanks for the report — looking into it." multiline />
        </Field>
      )}

      {show('createLabel') && (
        <>
          <Field label="Label Name">
            <Var k="name" placeholder="bug" />
          </Field>
          <Field label="Team ID" hint="Optional — scope label to a team.">
            <Var k="teamId" placeholder="team UUID" />
          </Field>
          <Field label="Color" hint="Optional — hex like #FF5733.">
            <Var k="color" placeholder="#5E6AD2" />
          </Field>
        </>
      )}

      {show('addLabelToIssue') && (
        <Field label="Label IDs" hint="Comma-separated label UUIDs (replaces existing).">
          <Var k="labelIds" placeholder="id1, id2" />
        </Field>
      )}

      {show('createProject', 'updateProject') && (
        <>
          <Field label="Project Name">
            <Var k="name" placeholder="Q3 Launch" />
          </Field>
          <Field label="Description" hint="Optional.">
            <Var k="description" placeholder="Goals and scope…" multiline />
          </Field>
          <Field label="State" hint="Optional — backlog, planned, started, paused, completed, canceled.">
            <Var k="state" placeholder="started" />
          </Field>
          <Field label="Target Date" hint="Optional — YYYY-MM-DD.">
            <Var k="targetDate" placeholder="2026-09-30" />
          </Field>
        </>
      )}

      {show('getProject', 'updateProject', 'listProjectMilestones', 'createProjectMilestone') && (
        <Field label="Project ID">
          <Var k="projectId" placeholder="project UUID" />
        </Field>
      )}

      {show('createProjectMilestone') && (
        <>
          <Field label="Milestone Name">
            <Var k="name" placeholder="Beta" />
          </Field>
          <Field label="Target Date" hint="Optional — YYYY-MM-DD.">
            <Var k="targetDate" placeholder="2026-08-15" />
          </Field>
        </>
      )}

      {show('createAttachment') && (
        <>
          <Field label="URL" hint="http(s) link to attach.">
            <Var k="url" placeholder="https://example.com/spec.pdf" />
          </Field>
          <Field label="Title" hint="Optional — display title.">
            <Var k="title" placeholder="Spec document" />
          </Field>
        </>
      )}

      {show('listIssues', 'searchIssues', 'listProjects', 'listLabels', 'listUsers') && (
        <Field label="Limit" hint="Max results (1–100).">
          <input
            type="number"
            min="1"
            max="100"
            value={config.limit ?? 25}
            onChange={(e) => updateConfig('limit', e.target.value)}
            className={inputCls}
          />
        </Field>
      )}
    </div>
  );
}
