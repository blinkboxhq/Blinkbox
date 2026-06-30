import {
  GitBranch, Search, Eye, Plus, Pencil, Trash2, UserCheck, ArrowRightLeft,
  List, MessageSquarePlus, MessagesSquare, MessageSquareX, Link2, Link,
  Users, Clock, ListChecks, FolderKanban, Folder, Activity, Layers,
  Component, User, UserSearch, CircleDot, Flag, SlidersHorizontal,
  LayoutDashboard, Repeat, MoveRight, Pencil as PencilIcon,
} from "lucide-react";
import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";

const ACCENT = "#2684FF";
const PRIORITIES = ["Highest", "High", "Medium", "Low", "Lowest"];

const GROUPS = [
  {
    title: "Issues",
    ops: [
      { value: "searchIssues", label: "Search (JQL)", icon: Search },
      { value: "getIssue", label: "Get Issue", icon: Eye },
      { value: "createIssue", label: "Create Issue", icon: Plus },
      { value: "updateIssue", label: "Update Issue", icon: Pencil },
      { value: "deleteIssue", label: "Delete Issue", icon: Trash2 },
      { value: "assignIssue", label: "Assign Issue", icon: UserCheck },
    ],
  },
  {
    title: "Transitions & Comments",
    ops: [
      { value: "transitionIssue", label: "Transition", icon: ArrowRightLeft },
      { value: "listTransitions", label: "List Transitions", icon: List },
      { value: "addComment", label: "Add Comment", icon: MessageSquarePlus },
      { value: "getComments", label: "Get Comments", icon: MessagesSquare },
      { value: "updateComment", label: "Update Comment", icon: PencilIcon },
      { value: "deleteComment", label: "Delete Comment", icon: MessageSquareX },
    ],
  },
  {
    title: "Links, Watchers & Work",
    ops: [
      { value: "linkIssues", label: "Link Issues", icon: Link2 },
      { value: "listLinkTypes", label: "Link Types", icon: Link },
      { value: "addWatcher", label: "Add Watcher", icon: Eye },
      { value: "getWatchers", label: "Get Watchers", icon: Users },
      { value: "addWorklog", label: "Add Worklog", icon: Clock },
      { value: "getWorklogs", label: "Get Worklogs", icon: ListChecks },
    ],
  },
  {
    title: "Projects & Metadata",
    ops: [
      { value: "listProjects", label: "List Projects", icon: FolderKanban },
      { value: "getProject", label: "Get Project", icon: Folder },
      { value: "getProjectStatuses", label: "Statuses", icon: Activity },
      { value: "listVersions", label: "List Versions", icon: Layers },
      { value: "createVersion", label: "Create Version", icon: Plus },
      { value: "listComponents", label: "Components", icon: Component },
      { value: "listIssueTypes", label: "Issue Types", icon: CircleDot },
      { value: "listPriorities", label: "Priorities", icon: Flag },
      { value: "getFields", label: "Fields", icon: SlidersHorizontal },
    ],
  },
  {
    title: "Users",
    ops: [
      { value: "getCurrentUser", label: "My Profile", icon: User },
      { value: "searchUsers", label: "Search Users", icon: UserSearch },
    ],
  },
  {
    title: "Boards & Sprints",
    ops: [
      { value: "listBoards", label: "List Boards", icon: LayoutDashboard },
      { value: "getBoardIssues", label: "Board Issues", icon: List },
      { value: "listSprints", label: "List Sprints", icon: Repeat },
      { value: "createSprint", label: "Create Sprint", icon: Plus },
      { value: "moveIssuesToSprint", label: "Move to Sprint", icon: MoveRight },
    ],
  },
];

const lbl = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
const inputCls = "w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#2684FF]/40";

export default function JiraNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "searchIssues";
  const set = (k) => (v) => updateConfig(k, v);

  const Field = ({ label, hint, children }) => (
    <div className="flex flex-col gap-1.5">
      <span className={lbl}>{label}</span>
      {children}
      {hint && <span className="text-[9px] text-zinc-600">{hint}</span>}
    </div>
  );

  const Var = ({ k, placeholder, multiline }) => (
    <SmartVariableInput nodeId={nodeId} value={config[k] || ""} onChange={set(k)} placeholder={placeholder} multiline={multiline} />
  );

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#0052CC]/5 border border-[#0052CC]/20 rounded-xl">
        <div className="p-2 bg-[#0052CC]/10 rounded-lg border border-[#0052CC]/20 shrink-0 flex items-center justify-center">
          <GitBranch className="w-5 h-5 text-[#2684FF]" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#2684FF]">Jira</span>
          <span className="text-[10px] text-zinc-500">Issues, sprints, worklogs, projects & more</span>
        </div>
      </div>

      <Field label="Jira Domain">
        <input value={config.domain || ""} onChange={(e) => updateConfig("domain", e.target.value)} placeholder="mycompany.atlassian.net" className={inputCls} />
      </Field>

      <div className="flex flex-col gap-3">
        <span className={lbl}>Operation</span>
        {GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{group.title}</span>
            <div className="grid grid-cols-2 gap-2">
              {group.ops.map((o) => {
                const Icon = o.icon;
                const active = op === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => updateConfig("operation", o.value)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all duration-150 ${
                      active ? "bg-[#0052CC]/10 border-[#2684FF]/40 text-[#2684FF]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                    <span className="text-[11px] font-semibold truncate">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[#222]" />

      {op === "searchIssues" && (
        <Field label="JQL Query" hint="Jira Query Language">
          <Var k="jql" placeholder='project = MYPROJ AND status = "To Do" ORDER BY created DESC' multiline />
        </Field>
      )}

      {["getIssue", "updateIssue", "deleteIssue", "assignIssue", "transitionIssue", "listTransitions", "addComment", "getComments", "updateComment", "deleteComment", "addWatcher", "getWatchers", "addWorklog", "getWorklogs"].includes(op) && (
        <Field label="Issue Key"><Var k="issueKey" placeholder="PROJ-123" /></Field>
      )}

      {(op === "createIssue" || op === "updateIssue") && (
        <>
          {op === "createIssue" && (
            <>
              <Field label="Project Key"><Var k="project" placeholder="PROJ" /></Field>
              <Field label="Issue Type">
                <input value={config.issueType || "Task"} onChange={(e) => updateConfig("issueType", e.target.value)} placeholder="Task" className={inputCls} />
              </Field>
            </>
          )}
          <Field label="Summary"><Var k="summary" placeholder="{{n1.title}}" /></Field>
          <Field label="Description"><Var k="description" placeholder="{{n1.body}}" multiline /></Field>
          <Field label="Assignee Account ID" hint="Optional"><Var k="assignee" placeholder="5b10 ..." /></Field>
          <Field label="Labels" hint="Comma-separated"><Var k="labels" placeholder="backend, urgent" /></Field>
          <Field label="Due Date" hint="YYYY-MM-DD, optional"><Var k="dueDate" placeholder="2026-07-15" /></Field>
          <Field label="Priority">
            <div className="flex flex-wrap gap-1.5">
              {PRIORITIES.map((p) => (
                <button key={p} type="button" onClick={() => updateConfig("priority", p)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${config.priority === p ? "bg-[#0052CC]/10 border-[#2684FF]/40 text-[#2684FF]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
                  {p}
                </button>
              ))}
            </div>
          </Field>
        </>
      )}

      {op === "createIssue" && (
        <Field label="Parent Key" hint="Optional — makes this a subtask"><Var k="parent" placeholder="PROJ-100" /></Field>
      )}

      {op === "deleteIssue" && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-[10px]">
          Permanently deletes the issue. Subtasks are kept unless toggled below.
        </div>
      )}

      {op === "assignIssue" && (
        <Field label="Assignee Account ID" hint="Leave blank to unassign"><Var k="assignee" placeholder="5b10 ..." /></Field>
      )}

      {op === "transitionIssue" && (
        <>
          <Field label="Transition ID" hint="From List Transitions"><Var k="transitionId" placeholder="21" /></Field>
          <Field label="Comment" hint="Optional"><Var k="comment" placeholder="Moving to done" multiline /></Field>
        </>
      )}

      {op === "addComment" && (
        <Field label="Comment"><Var k="comment" placeholder="{{n1.message}}" multiline /></Field>
      )}

      {(op === "updateComment" || op === "deleteComment") && (
        <Field label="Comment ID"><Var k="commentId" placeholder="10001" /></Field>
      )}

      {op === "updateComment" && (
        <Field label="New Comment"><Var k="comment" placeholder="Updated text" multiline /></Field>
      )}

      {op === "linkIssues" && (
        <>
          <Field label="Link Type" hint="e.g. Relates, Blocks, Duplicate"><Var k="linkType" placeholder="Relates" /></Field>
          <Field label="Inward Issue"><Var k="inwardIssue" placeholder="PROJ-1" /></Field>
          <Field label="Outward Issue"><Var k="outwardIssue" placeholder="PROJ-2" /></Field>
        </>
      )}

      {op === "addWatcher" && (
        <Field label="Account ID"><Var k="accountId" placeholder="5b10 ..." /></Field>
      )}

      {op === "addWorklog" && (
        <>
          <Field label="Time Spent" hint="e.g. 1h 30m, 2d"><Var k="timeSpent" placeholder="1h 30m" /></Field>
          <Field label="Comment" hint="Optional"><Var k="comment" placeholder="Investigated bug" multiline /></Field>
          <Field label="Started" hint="ISO datetime, optional"><Var k="started" placeholder="2026-06-30T10:00:00.000+0000" /></Field>
        </>
      )}

      {["listProjects", "searchUsers"].includes(op) && (
        <Field label="Query" hint="Optional filter"><Var k="query" placeholder="search text" /></Field>
      )}

      {["getProject", "getProjectStatuses", "listVersions", "listComponents", "listBoards"].includes(op) && (
        <Field label="Project Key"><Var k="project" placeholder="PROJ" /></Field>
      )}

      {op === "createVersion" && (
        <>
          <Field label="Project ID" hint="Numeric project ID"><Var k="projectId" placeholder="10000" /></Field>
          <Field label="Version Name"><Var k="name" placeholder="1.2.0" /></Field>
          <Field label="Description" hint="Optional"><Var k="description" placeholder="Q3 release" /></Field>
          <Field label="Release Date" hint="YYYY-MM-DD, optional"><Var k="releaseDate" placeholder="2026-09-01" /></Field>
        </>
      )}

      {op === "searchUsers" && (
        <Field label="Search Query"><Var k="query" placeholder="jane@example.com" /></Field>
      )}

      {["getBoardIssues", "listSprints", "createSprint"].includes(op) && (
        <Field label="Board ID"><Var k="boardId" placeholder="42" /></Field>
      )}

      {op === "listSprints" && (
        <Field label="Sprint State" hint="Optional — active, future, closed"><Var k="sprintState" placeholder="active" /></Field>
      )}

      {op === "createSprint" && (
        <>
          <Field label="Sprint Name"><Var k="name" placeholder="Sprint 12" /></Field>
          <Field label="Start Date" hint="ISO, optional"><Var k="startDate" placeholder="2026-07-01T00:00:00.000Z" /></Field>
          <Field label="End Date" hint="ISO, optional"><Var k="endDate" placeholder="2026-07-14T00:00:00.000Z" /></Field>
          <Field label="Goal" hint="Optional"><Var k="goal" placeholder="Ship billing v2" /></Field>
        </>
      )}

      {op === "moveIssuesToSprint" && (
        <>
          <Field label="Sprint ID"><Var k="sprintId" placeholder="123" /></Field>
          <Field label="Issue Keys" hint="Comma-separated"><Var k="issueKeys" placeholder="PROJ-1, PROJ-2" /></Field>
        </>
      )}

      {["searchIssues", "getComments", "getWorklogs", "listProjects", "listBoards", "getBoardIssues", "listSprints", "searchUsers"].includes(op) && (
        <Field label="Limit" hint="Max results (1–100)">
          <input type="number" min="1" max="100" value={config.limit || 20} onChange={(e) => updateConfig("limit", Number(e.target.value))} className={inputCls} />
        </Field>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Jira API Token (email:token)" placeholder="Select Jira credential..." />
    </div>
  );
}
