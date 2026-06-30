import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";
import {
  Plus, FileText, Pencil, Trash2, ListChecks, MessageSquare, MessagesSquare, Layers,
  GitPullRequest, GitMerge, UserPlus, List, FolderGit2, GitBranch, GitCommitHorizontal,
  Workflow, Play, History, Hammer, FolderKanban, FolderOpen, Users, RefreshCw, Map,
} from "lucide-react";

const ACCENT = "#0078D4";

const GROUPS = [
  {
    title: "Work Items",
    ops: [
      { value: "createWorkItem", label: "Create Item", icon: Plus },
      { value: "getWorkItem", label: "Get Item", icon: FileText },
      { value: "updateWorkItem", label: "Update Item", icon: Pencil },
      { value: "deleteWorkItem", label: "Delete Item", icon: Trash2 },
      { value: "listWorkItems", label: "Query (WIQL)", icon: ListChecks },
      { value: "addWorkItemComment", label: "Add Comment", icon: MessageSquare },
      { value: "listWorkItemComments", label: "List Comments", icon: MessagesSquare },
      { value: "listWorkItemTypes", label: "List Types", icon: Layers },
    ],
  },
  {
    title: "Pull Requests",
    ops: [
      { value: "createPR", label: "Create PR", icon: GitPullRequest },
      { value: "getPR", label: "Get PR", icon: FileText },
      { value: "listPRs", label: "List PRs", icon: List },
      { value: "updatePR", label: "Update PR", icon: Pencil },
      { value: "completePR", label: "Complete PR", icon: GitMerge },
      { value: "addPRReviewer", label: "Add Reviewer", icon: UserPlus },
    ],
  },
  {
    title: "Repos",
    ops: [
      { value: "listRepos", label: "List Repos", icon: FolderGit2 },
      { value: "getRepo", label: "Get Repo", icon: FolderOpen },
      { value: "listBranches", label: "List Branches", icon: GitBranch },
      { value: "listCommits", label: "List Commits", icon: GitCommitHorizontal },
    ],
  },
  {
    title: "Pipelines & Builds",
    ops: [
      { value: "listPipelines", label: "List Pipelines", icon: Workflow },
      { value: "getPipeline", label: "Get Pipeline", icon: FileText },
      { value: "runPipeline", label: "Run Pipeline", icon: Play },
      { value: "listPipelineRuns", label: "List Runs", icon: History },
      { value: "getPipelineRun", label: "Get Run", icon: FileText },
      { value: "listBuilds", label: "List Builds", icon: Hammer },
      { value: "getBuild", label: "Get Build", icon: FileText },
      { value: "queueBuild", label: "Queue Build", icon: Play },
    ],
  },
  {
    title: "Projects & Boards",
    ops: [
      { value: "listProjects", label: "List Projects", icon: FolderKanban },
      { value: "getProject", label: "Get Project", icon: FolderOpen },
      { value: "listTeams", label: "List Teams", icon: Users },
      { value: "listIterations", label: "List Iterations", icon: RefreshCw },
      { value: "listAreas", label: "List Areas", icon: Map },
    ],
  },
];

const WORK_ITEM_TYPES = ["Bug", "Task", "User Story", "Feature", "Epic"];
const PRIORITIES = [
  { value: "1", label: "1 · Critical" },
  { value: "2", label: "2 · High" },
  { value: "3", label: "3 · Medium" },
  { value: "4", label: "4 · Low" },
];
const PR_STATUS = ["active", "completed", "abandoned"];
const MERGE_STRATEGY = ["squash", "noFastForward", "rebase", "rebaseMerge"];

const lbl = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
const inputCls =
  "w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#0078D4]/40";

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={lbl}>{label}</span>
      {children}
      {hint && <span className="text-[10px] text-zinc-600">{hint}</span>}
    </div>
  );
}

export default function AzureDevOpsNode({ config = {}, updateConfig }) {
  const op = config.operation || "createWorkItem";
  const set = (k) => (v) => updateConfig(k, v);
  const show = (...ops) => ops.includes(op);

  const Var = ({ k, placeholder, multiline, def }) => (
    <SmartVariableInput
      value={config[k] ?? def ?? ""}
      onChange={set(k)}
      placeholder={placeholder}
      multiline={multiline}
      className={inputCls}
    />
  );

  const Pills = ({ k, items, def }) => (
    <div className="flex gap-1.5 flex-wrap">
      {items.map((it) => {
        const value = typeof it === "string" ? it : it.value;
        const label = typeof it === "string" ? it : it.label;
        const active = (config[k] ?? def) === value;
        return (
          <button
            key={value}
            onClick={() => updateConfig(k, value)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-150 ${
              active
                ? "bg-[#0078D4]/10 border-[#0078D4]/40 text-[#4ca6ee]"
                : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#0078D4]/10 border border-[#0078D4]/25 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#0078D4">
            <path d="M0 5.065v13.87l4.348 3.826 8.217-3.13V22l4.13-4.13L22 16.413V2.63L16.478 0 8.217 3.174V0L0 5.065zm4.348 11.304l-2.174-1.826V6.826L4.348 5.13v11.239zm4.87 2.37L4.87 16.565V5.087l4.348-1.956v15.608zm11.13-3.13l-5.217 1.304-2.826-1.63V4.695l8.043 3.043v7.87z" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Azure DevOps</div>
          <div className="text-[11px] text-zinc-500">Work items, PRs, repos, pipelines</div>
        </div>
      </div>

      <Field label="Credential" hint="Personal Access Token with the right scopes.">
        <CredentialPicker
          provider="azure_devops"
          value={config.credentialId || ""}
          onChange={set("credentialId")}
          accentColor={ACCENT}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Organization">
          <Var k="organization" placeholder="my-org" />
        </Field>
        <Field label="Project" hint="Required for most operations.">
          <Var k="project" placeholder="MyProject" />
        </Field>
      </div>

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
                    onClick={() => updateConfig("operation", o.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all duration-150 ${
                      active
                        ? "bg-[#0078D4]/10 border-[#0078D4]/40 text-[#4ca6ee]"
                        : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
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

      {show("createWorkItem") && (
        <>
          <Field label="Work Item Type">
            <Pills k="workItemType" items={WORK_ITEM_TYPES} def="Task" />
          </Field>
          <Field label="Title">
            <Var k="title" placeholder="{{ $json.title }}" />
          </Field>
          <Field label="Description">
            <Var k="description" placeholder="Work item description…" multiline />
          </Field>
          <Field label="Assigned To" hint="User email or display name.">
            <Var k="assignedTo" placeholder="user@company.com" />
          </Field>
          <Field label="Priority">
            <Pills k="priority" items={PRIORITIES} def="2" />
          </Field>
          <Field label="Tags" hint="Optional — semicolon-separated.">
            <Var k="tags" placeholder="backend; urgent" />
          </Field>
        </>
      )}

      {show("getWorkItem", "updateWorkItem", "deleteWorkItem", "addWorkItemComment", "listWorkItemComments") && (
        <Field label="Work Item ID">
          <Var k="workItemId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {show("updateWorkItem") && (
        <>
          <Field label="New Title" hint="Optional.">
            <Var k="updateTitle" placeholder="Updated title" />
          </Field>
          <Field label="State" hint="Optional — e.g. Active, Resolved, Closed.">
            <Var k="state" placeholder="Active" />
          </Field>
          <Field label="Assigned To" hint="Optional.">
            <Var k="assignedTo" placeholder="user@company.com" />
          </Field>
          <Field label="Priority" hint="Optional.">
            <Pills k="priority" items={PRIORITIES} />
          </Field>
          <Field label="Description" hint="Optional.">
            <Var k="description" placeholder="Updated description…" multiline />
          </Field>
        </>
      )}

      {show("addWorkItemComment") && (
        <Field label="Comment Text">
          <Var k="text" placeholder="Status updated automatically." multiline />
        </Field>
      )}

      {show("listWorkItems") && (
        <Field label="WIQL Query" hint="Use @project for the current project.">
          <Var
            k="wiql"
            placeholder="SELECT [Id] FROM WorkItems WHERE [System.State] = 'Active'"
            def="SELECT [Id] FROM WorkItems WHERE [System.TeamProject] = @project ORDER BY [System.CreatedDate] DESC"
            multiline
          />
        </Field>
      )}

      {show(
        "createPR", "getPR", "listPRs", "updatePR", "completePR", "addPRReviewer",
        "getRepo", "listBranches", "listCommits"
      ) && (
        <Field label="Repository" hint="Repo name or ID.">
          <Var k="repositoryId" placeholder="my-repo" />
        </Field>
      )}

      {show("createPR") && (
        <>
          <Field label="Source Branch">
            <Var k="sourceRefName" placeholder="refs/heads/feature" />
          </Field>
          <Field label="Target Branch">
            <Var k="targetRefName" placeholder="refs/heads/main" def="refs/heads/main" />
          </Field>
          <Field label="PR Title">
            <Var k="prTitle" placeholder="Merge feature into main" />
          </Field>
          <Field label="Description" hint="Optional.">
            <Var k="prDescription" placeholder="What this PR does…" multiline />
          </Field>
          <Field label="Reviewer IDs" hint="Optional — comma-separated user IDs.">
            <Var k="reviewers" placeholder="id1, id2" />
          </Field>
        </>
      )}

      {show("getPR", "updatePR", "completePR", "addPRReviewer") && (
        <Field label="Pull Request ID">
          <Var k="pullRequestId" placeholder="{{ $json.pullRequestId }}" />
        </Field>
      )}

      {show("updatePR") && (
        <>
          <Field label="New Title" hint="Optional.">
            <Var k="prTitle" placeholder="Updated PR title" />
          </Field>
          <Field label="New Description" hint="Optional.">
            <Var k="prDescription" placeholder="Updated description…" multiline />
          </Field>
          <Field label="Status" hint="Optional.">
            <Pills k="prStatus" items={PR_STATUS} />
          </Field>
        </>
      )}

      {show("listPRs") && (
        <Field label="Status Filter" hint="Optional.">
          <Pills k="prStatus" items={PR_STATUS} />
        </Field>
      )}

      {show("completePR") && (
        <>
          <Field label="Merge Strategy">
            <Pills k="mergeStrategy" items={MERGE_STRATEGY} def="squash" />
          </Field>
          <Field label="Delete Source Branch">
            <button
              onClick={() => updateConfig("deleteSourceBranch", !config.deleteSourceBranch)}
              className={`relative w-10 h-5 rounded-full transition-colors duration-150 ${
                config.deleteSourceBranch ? "bg-[#0078D4]" : "bg-zinc-700"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-150 ${
                  config.deleteSourceBranch ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </Field>
        </>
      )}

      {show("addPRReviewer") && (
        <Field label="Reviewer ID">
          <Var k="reviewerId" placeholder="user GUID" />
        </Field>
      )}

      {show("getPipeline", "runPipeline", "listPipelineRuns", "getPipelineRun") && (
        <Field label="Pipeline ID">
          <Var k="pipelineId" placeholder="42" />
        </Field>
      )}

      {show("runPipeline", "queueBuild") && (
        <Field label="Branch" hint="Branch to build (without refs/heads/).">
          <Var k="branch" placeholder="main" def="main" />
        </Field>
      )}

      {show("getPipelineRun") && (
        <Field label="Run ID">
          <Var k="runId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {show("getBuild") && (
        <Field label="Build ID">
          <Var k="buildId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {show("queueBuild") && (
        <Field label="Build Definition ID">
          <Var k="definitionId" placeholder="12" />
        </Field>
      )}

      {show("listIterations") && (
        <Field label="Team" hint="Team name within the project.">
          <Var k="team" placeholder="MyProject Team" />
        </Field>
      )}

      {show("listWorkItems", "listPRs", "listCommits", "listBuilds", "listProjects") && (
        <Field label="Limit" hint="Max results.">
          <input
            type="number"
            min="1"
            max="200"
            value={config.wiqlLimit ?? config.limit ?? 50}
            onChange={(e) => updateConfig("limit", e.target.value)}
            className={inputCls}
          />
        </Field>
      )}
    </div>
  );
}
