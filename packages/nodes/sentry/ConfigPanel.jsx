import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";
import {
  List, FileText, Pencil, CheckCircle2, BellOff, UserPlus, Trash2, Activity, Clock,
  MessageSquare, MessagesSquare, Tags, FolderKanban, FolderOpen, Plus, KeyRound, Bug,
  Rocket, Flag, UploadCloud, Server, Users, Building2, Send,
} from "lucide-react";

const ACCENT = "#FB4226";

const GROUPS = [
  {
    title: "Issues",
    ops: [
      { value: "listIssues", label: "List Issues", icon: List },
      { value: "getIssue", label: "Get Issue", icon: FileText },
      { value: "updateIssue", label: "Update Issue", icon: Pencil },
      { value: "resolveIssue", label: "Resolve", icon: CheckCircle2 },
      { value: "ignoreIssue", label: "Ignore", icon: BellOff },
      { value: "assignIssue", label: "Assign", icon: UserPlus },
      { value: "deleteIssue", label: "Delete", icon: Trash2 },
      { value: "listEvents", label: "List Events", icon: Activity },
      { value: "latestEvent", label: "Latest Event", icon: Clock },
      { value: "listIssueComments", label: "List Comments", icon: MessagesSquare },
      { value: "addIssueComment", label: "Add Comment", icon: MessageSquare },
      { value: "listIssueTags", label: "List Tags", icon: Tags },
    ],
  },
  {
    title: "Projects",
    ops: [
      { value: "listProjects", label: "List Projects", icon: FolderKanban },
      { value: "getProject", label: "Get Project", icon: FolderOpen },
      { value: "createProject", label: "Create Project", icon: Plus },
      { value: "updateProject", label: "Update Project", icon: Pencil },
      { value: "listProjectKeys", label: "List DSN Keys", icon: KeyRound },
      { value: "listProjectIssues", label: "Project Issues", icon: Bug },
    ],
  },
  {
    title: "Releases & Deploys",
    ops: [
      { value: "listReleases", label: "List Releases", icon: Rocket },
      { value: "getRelease", label: "Get Release", icon: FileText },
      { value: "createRelease", label: "Create Release", icon: Plus },
      { value: "finalizeRelease", label: "Finalize", icon: Flag },
      { value: "createDeploy", label: "Create Deploy", icon: UploadCloud },
      { value: "listDeploys", label: "List Deploys", icon: Server },
    ],
  },
  {
    title: "Teams & Org",
    ops: [
      { value: "listTeams", label: "List Teams", icon: Users },
      { value: "listTeamProjects", label: "Team Projects", icon: FolderKanban },
      { value: "listTeamMembers", label: "Team Members", icon: Users },
      { value: "listOrganizations", label: "List Orgs", icon: Building2 },
      { value: "getOrganization", label: "Get Org", icon: Building2 },
      { value: "listOrgMembers", label: "Org Members", icon: Users },
      { value: "captureEvent", label: "Capture Event", icon: Send },
    ],
  },
];

const QUERIES = ["is:unresolved", "is:resolved", "is:ignored", "is:assigned"];
const PLATFORMS = ["javascript", "node", "python", "react", "go", "ruby"];
const LEVELS = ["error", "warning", "info", "fatal", "debug"];

const lbl = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
const inputCls =
  "w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#FB4226]/40";

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={lbl}>{label}</span>
      {children}
      {hint && <span className="text-[10px] text-zinc-600">{hint}</span>}
    </div>
  );
}

const ORG_OPS = [
  "listIssues", "getProject", "createProject", "updateProject", "listProjects",
  "listProjectKeys", "listProjectIssues", "listReleases", "getRelease", "createRelease",
  "finalizeRelease", "createDeploy", "listDeploys", "listTeams", "listTeamProjects",
  "listTeamMembers", "getOrganization", "listOrgMembers",
];
const PROJECT_OPS = ["listIssues", "getProject", "updateProject", "listProjectKeys", "listProjectIssues", "captureEvent"];

export default function SentryNode({ config = {}, updateConfig }) {
  const op = config.operation || "listIssues";
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
        const active = (config[k] ?? def) === it;
        return (
          <button
            key={it}
            onClick={() => updateConfig(k, it)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-150 ${
              active
                ? "bg-[#FB4226]/10 border-[#FB4226]/40 text-[#fb6a52]"
                : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
            }`}
          >
            {it}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#FB4226]/10 border border-[#FB4226]/25 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#FB4226">
            <path d="M14.707 2.293a1 1 0 00-1.414 0L12 3.586 3.293 12.293A1 1 0 002 13v8a1 1 0 001 1h8a1 1 0 00.707-.293L14.707 18.7a1 1 0 000-1.414L12.414 15l2.293-2.293a1 1 0 000-1.414L12.414 9l2.293-2.293a1 1 0 000-1.414z" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Sentry</div>
          <div className="text-[11px] text-zinc-500">Issues, releases, projects & teams</div>
        </div>
      </div>

      <Field label="Credential" hint="Sentry auth token with the right scopes.">
        <CredentialPicker
          provider="sentry"
          value={config.credentialId || ""}
          onChange={set("credentialId")}
          accentColor={ACCENT}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        {ORG_OPS.includes(op) && (
          <Field label="Organization Slug">
            <Var k="organization" placeholder="my-org" />
          </Field>
        )}
        {PROJECT_OPS.includes(op) && (
          <Field label="Project Slug">
            <Var k="project" placeholder="my-app" />
          </Field>
        )}
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
                        ? "bg-[#FB4226]/10 border-[#FB4226]/40 text-[#fb6a52]"
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

      {show("getIssue", "updateIssue", "resolveIssue", "ignoreIssue", "assignIssue", "deleteIssue", "listEvents", "latestEvent", "listIssueComments", "addIssueComment", "listIssueTags") && (
        <Field label="Issue ID">
          <Var k="issueId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {show("listIssues", "listProjectIssues") && (
        <Field label="Query Filter" hint="Sentry search syntax.">
          <Pills k="query" items={QUERIES} def="is:unresolved" />
        </Field>
      )}

      {show("updateIssue") && (
        <>
          <Field label="Status" hint="resolved, unresolved, or ignored.">
            <Var k="status" placeholder="resolved" />
          </Field>
          <Field label="Assigned To" hint="Optional — username or email.">
            <Var k="assignedTo" placeholder="user@company.com" />
          </Field>
        </>
      )}

      {show("assignIssue") && (
        <Field label="Assignee" hint="Username or email.">
          <Var k="assignee" placeholder="{{ $json.oncallEngineer }}" />
        </Field>
      )}

      {show("addIssueComment") && (
        <Field label="Comment Text">
          <Var k="text" placeholder="Investigating this now." multiline />
        </Field>
      )}

      {show("createProject") && (
        <Field label="Team Slug">
          <Var k="team" placeholder="backend" />
        </Field>
      )}

      {show("createProject", "updateProject") && (
        <>
          <Field label="Project Name">
            <Var k="name" placeholder="{{ $json.repoName }}" />
          </Field>
          <Field label="Platform">
            <Pills k="platform" items={PLATFORMS} def="javascript" />
          </Field>
        </>
      )}

      {show("updateProject") && (
        <Field label="New Slug" hint="Optional.">
          <Var k="newSlug" placeholder="renamed-project" />
        </Field>
      )}

      {show("getRelease", "createRelease", "finalizeRelease", "createDeploy", "listDeploys") && (
        <Field label="Version">
          <Var k="version" placeholder="1.0.0 or {{ $json.sha }}" />
        </Field>
      )}

      {show("createRelease") && (
        <>
          <Field label="Project Slugs" hint="Comma-separated.">
            <Var k="projects" placeholder="frontend, backend" />
          </Field>
          <Field label="Commit Ref" hint="Optional — git SHA.">
            <Var k="ref" placeholder="{{ $json.sha }}" />
          </Field>
          <Field label="URL" hint="Optional — release notes link.">
            <Var k="url" placeholder="https://github.com/org/repo/releases/tag/1.0.0" />
          </Field>
        </>
      )}

      {show("createDeploy") && (
        <>
          <Field label="Environment">
            <Var k="environment" placeholder="production" />
          </Field>
          <Field label="Deploy Name" hint="Optional.">
            <Var k="deployName" placeholder="prod-deploy-42" />
          </Field>
          <Field label="Deploy URL" hint="Optional.">
            <Var k="deployUrl" placeholder="https://app.example.com" />
          </Field>
        </>
      )}

      {show("listTeamProjects", "listTeamMembers") && (
        <Field label="Team Slug">
          <Var k="team" placeholder="backend" />
        </Field>
      )}

      {show("captureEvent") && (
        <>
          <Field label="DSN" hint="Project DSN (https://KEY@host/PROJECT_ID).">
            <Var k="dsn" placeholder="https://abc@o0.ingest.sentry.io/123" />
          </Field>
          <Field label="Message">
            <Var k="message" placeholder="Something happened" />
          </Field>
          <Field label="Level">
            <Pills k="level" items={LEVELS} def="error" />
          </Field>
        </>
      )}

      {show("listIssues", "listEvents", "listProjectIssues", "listReleases") && (
        <Field label="Limit" hint="Max results (1–100).">
          <input
            type="number"
            min="1"
            max="100"
            value={config.limit ?? 25}
            onChange={(e) => updateConfig("limit", e.target.value)}
            className={inputCls}
          />
        </Field>
      )}
    </div>
  );
}
