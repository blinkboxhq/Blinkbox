import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";
import {
  List, FileText, Rocket, RotateCcw, Ban, Trash2, Files, ScrollText, Link2, ArrowUpCircle,
  FolderKanban, FolderOpen, Plus, Pencil, Pause, Play, Globe, ShieldCheck, Variable,
  KeyRound, Network, GitBranch, Users, Building2, Database, User,
} from "lucide-react";

const ACCENT = "#ffffff";

const GROUPS = [
  {
    title: "Deployments",
    ops: [
      { value: "listDeployments", label: "List Deployments", icon: List },
      { value: "getDeployment", label: "Get Deployment", icon: FileText },
      { value: "triggerDeploy", label: "Trigger Deploy", icon: Rocket },
      { value: "redeploy", label: "Redeploy", icon: RotateCcw },
      { value: "promoteDeployment", label: "Promote to Prod", icon: ArrowUpCircle },
      { value: "cancelDeploy", label: "Cancel Deploy", icon: Ban },
      { value: "deleteDeployment", label: "Delete Deploy", icon: Trash2 },
      { value: "listDeploymentFiles", label: "List Files", icon: Files },
      { value: "getDeploymentEvents", label: "Build Logs", icon: ScrollText },
      { value: "listDeploymentAliases", label: "Deploy Aliases", icon: Link2 },
    ],
  },
  {
    title: "Projects",
    ops: [
      { value: "listProjects", label: "List Projects", icon: FolderKanban },
      { value: "getProject", label: "Get Project", icon: FolderOpen },
      { value: "createProject", label: "Create Project", icon: Plus },
      { value: "updateProject", label: "Update Project", icon: Pencil },
      { value: "deleteProject", label: "Delete Project", icon: Trash2 },
      { value: "pauseProject", label: "Pause Project", icon: Pause },
      { value: "unpauseProject", label: "Unpause Project", icon: Play },
    ],
  },
  {
    title: "Project Domains",
    ops: [
      { value: "listProjectDomains", label: "List Domains", icon: Globe },
      { value: "addProjectDomain", label: "Add Domain", icon: Plus },
      { value: "removeProjectDomain", label: "Remove Domain", icon: Trash2 },
      { value: "verifyProjectDomain", label: "Verify Domain", icon: ShieldCheck },
    ],
  },
  {
    title: "Environment Variables",
    ops: [
      { value: "listEnvVars", label: "List Env Vars", icon: Variable },
      { value: "getEnvVar", label: "Get Env Var", icon: FileText },
      { value: "createEnvVar", label: "Create Env Var", icon: Plus },
      { value: "updateEnvVar", label: "Update Env Var", icon: Pencil },
      { value: "deleteEnvVar", label: "Delete Env Var", icon: Trash2 },
    ],
  },
  {
    title: "Account Domains & DNS",
    ops: [
      { value: "listAccountDomains", label: "List Domains", icon: Globe },
      { value: "getDomain", label: "Get Domain", icon: FileText },
      { value: "addAccountDomain", label: "Add Domain", icon: Plus },
      { value: "removeDomain", label: "Remove Domain", icon: Trash2 },
      { value: "checkDomainAvailability", label: "Check Availability", icon: ShieldCheck },
      { value: "listDnsRecords", label: "List DNS", icon: Network },
      { value: "createDnsRecord", label: "Create DNS", icon: Plus },
      { value: "deleteDnsRecord", label: "Delete DNS", icon: Trash2 },
    ],
  },
  {
    title: "Aliases, Teams & Misc",
    ops: [
      { value: "listAliases", label: "List Aliases", icon: Link2 },
      { value: "assignAlias", label: "Assign Alias", icon: GitBranch },
      { value: "deleteAlias", label: "Delete Alias", icon: Trash2 },
      { value: "listTeams", label: "List Teams", icon: Users },
      { value: "getTeam", label: "Get Team", icon: Building2 },
      { value: "listTeamMembers", label: "Team Members", icon: Users },
      { value: "listEdgeConfigs", label: "Edge Configs", icon: Database },
      { value: "getCurrentUser", label: "Current User", icon: User },
    ],
  },
];

const TARGETS = ["production", "preview", "development"];
const STATES = ["all", "READY", "ERROR", "BUILDING", "QUEUED", "CANCELED"];
const FRAMEWORKS = ["nextjs", "vite", "remix", "astro", "svelte", "nuxtjs"];
const ENV_TYPES = ["encrypted", "plain", "sensitive"];
const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS"];

const lbl = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
const inputCls =
  "w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500";

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={lbl}>{label}</span>
      {children}
      {hint && <span className="text-[10px] text-zinc-600">{hint}</span>}
    </div>
  );
}

const PROJECT_OPS = [
  "listDeployments", "triggerDeploy", "redeploy", "promoteDeployment", "getProject",
  "updateProject", "deleteProject", "pauseProject", "unpauseProject", "listProjectDomains",
  "addProjectDomain", "removeProjectDomain", "verifyProjectDomain", "listEnvVars", "getEnvVar",
  "createEnvVar", "updateEnvVar", "deleteEnvVar", "listAliases",
];
const DEPLOYMENT_OPS = [
  "getDeployment", "redeploy", "cancelDeploy", "deleteDeployment", "listDeploymentFiles",
  "getDeploymentEvents", "listDeploymentAliases", "promoteDeployment", "assignAlias",
];

export default function VercelNode({ config = {}, updateConfig }) {
  const op = config.operation || "listDeployments";
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
                ? "bg-white/10 border-white/40 text-white"
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
        <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/25 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="white">
            <path d="M12 1L1 21h22L12 1z" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Vercel</div>
          <div className="text-[11px] text-zinc-500">Deployments, projects, domains, env vars</div>
        </div>
      </div>

      <Field label="Credential" hint="Vercel API token with the right scopes.">
        <CredentialPicker
          provider="vercel"
          value={config.credentialId || ""}
          onChange={set("credentialId")}
          accentColor={ACCENT}
        />
      </Field>

      <Field label="Team ID / Slug" hint="Optional — scope calls to a team.">
        <Var k="teamId" placeholder="team_xxx (leave blank for personal)" />
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
                    onClick={() => updateConfig("operation", o.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all duration-150 ${
                      active
                        ? "bg-white/10 border-white/40 text-white"
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

      {PROJECT_OPS.includes(op) && (
        <Field label="Project Name or ID">
          <Var k="projectId" placeholder="my-next-app" />
        </Field>
      )}

      {DEPLOYMENT_OPS.includes(op) && (
        <Field label="Deployment ID">
          <Var k="deploymentId" placeholder="dpl_{{ $json.id }}" />
        </Field>
      )}

      {show("listDeployments") && (
        <>
          <Field label="State Filter">
            <Pills k="stateFilter" items={STATES} def="all" />
          </Field>
        </>
      )}

      {show("triggerDeploy", "redeploy", "createProject", "updateProject") && (
        <Field label="Target Environment">
          <Pills k="target" items={TARGETS} def="production" />
        </Field>
      )}

      {show("triggerDeploy") && (
        <Field label="Git Branch / Ref">
          <Var k="branch" placeholder="main" def="main" />
        </Field>
      )}

      {show("createProject", "updateProject") && (
        <>
          <Field label="Project Name">
            <Var k="name" placeholder="{{ $json.repo }}" />
          </Field>
          <Field label="Framework">
            <Pills k="framework" items={FRAMEWORKS} />
          </Field>
          <Field label="Build Command" hint="Optional.">
            <Var k="buildCommand" placeholder="npm run build" />
          </Field>
          <Field label="Root Directory" hint="Optional.">
            <Var k="rootDirectory" placeholder="apps/web" />
          </Field>
        </>
      )}

      {show("createProject") && (
        <Field label="Git Repository" hint="Optional — owner/repo to connect.">
          <Var k="gitRepo" placeholder="org/repo" />
        </Field>
      )}

      {show("addProjectDomain", "removeProjectDomain", "verifyProjectDomain", "getDomain", "addAccountDomain", "removeDomain", "checkDomainAvailability", "listDnsRecords", "createDnsRecord", "deleteDnsRecord") && (
        <Field label="Domain">
          <Var k="domain" placeholder="app.mycompany.com" />
        </Field>
      )}

      {show("createEnvVar", "updateEnvVar") && (
        <>
          {show("createEnvVar") && (
            <Field label="Key">
              <Var k="key" placeholder="DATABASE_URL" />
            </Field>
          )}
          <Field label="Value" hint="Stored encrypted by Vercel.">
            <Var k="value" placeholder="{{ $json.secret }}" />
          </Field>
          <Field label="Type">
            <Pills k="envType" items={ENV_TYPES} def="encrypted" />
          </Field>
          <Field label="Targets" hint="Comma-separated.">
            <Var k="target" placeholder="production,preview" def="production,preview,development" />
          </Field>
        </>
      )}

      {show("getEnvVar", "updateEnvVar", "deleteEnvVar") && (
        <Field label="Env Var ID">
          <Var k="envId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {show("createDnsRecord") && (
        <>
          <Field label="Record Type">
            <Pills k="recordType" items={DNS_TYPES} def="A" />
          </Field>
          <Field label="Record Name" hint="Subdomain, blank = apex.">
            <Var k="recordName" placeholder="www" />
          </Field>
          <Field label="Record Value">
            <Var k="recordValue" placeholder="76.76.21.21" />
          </Field>
          <Field label="TTL" hint="Optional — seconds.">
            <Var k="ttl" placeholder="60" />
          </Field>
        </>
      )}

      {show("deleteDnsRecord") && (
        <Field label="Record ID">
          <Var k="recordId" placeholder="{{ $json.uid }}" />
        </Field>
      )}

      {show("assignAlias") && (
        <Field label="Alias Domain">
          <Var k="alias" placeholder="my-app.vercel.app" />
        </Field>
      )}

      {show("deleteAlias") && (
        <Field label="Alias ID">
          <Var k="aliasId" placeholder="{{ $json.uid }}" />
        </Field>
      )}

      {show("getTeam", "listTeamMembers") && (
        <Field label="Team ID">
          <Var k="teamId" placeholder="team_xxx" />
        </Field>
      )}

      {show("listProjects") && (
        <Field label="Search" hint="Optional — filter by name.">
          <Var k="search" placeholder="api" />
        </Field>
      )}

      {show("listDeployments", "listProjects", "getDeploymentEvents", "listAliases", "listAccountDomains", "listDnsRecords", "listTeams", "listTeamMembers") && (
        <Field label="Limit" hint="Max results.">
          <input
            type="number"
            min="1"
            max="100"
            value={config.limit ?? 10}
            onChange={(e) => updateConfig("limit", e.target.value)}
            className={inputCls}
          />
        </Field>
      )}
    </div>
  );
}
