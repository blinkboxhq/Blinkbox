import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";
import {
  List, FolderOpen, Plus, Pencil, Trash2, Rocket, FileText, Ban, RotateCcw, Lock, Unlock,
  Files, Hammer, History, FunctionSquare, ClipboardList, Inbox, Variable, Network, Globe,
  Webhook, Users, Building2, User,
} from "lucide-react";

const ACCENT = "#00AD9F";

const GROUPS = [
  {
    title: "Sites",
    ops: [
      { value: "listSites", label: "List Sites", icon: List },
      { value: "getSite", label: "Get Site", icon: FolderOpen },
      { value: "createSite", label: "Create Site", icon: Plus },
      { value: "updateSite", label: "Update Site", icon: Pencil },
      { value: "deleteSite", label: "Delete Site", icon: Trash2 },
    ],
  },
  {
    title: "Deploys",
    ops: [
      { value: "listDeploys", label: "List Deploys", icon: List },
      { value: "getDeploy", label: "Get Deploy", icon: FileText },
      { value: "createDeploy", label: "Create Deploy", icon: Rocket },
      { value: "cancelDeploy", label: "Cancel Deploy", icon: Ban },
      { value: "restoreDeploy", label: "Restore Deploy", icon: RotateCcw },
      { value: "lockDeploy", label: "Lock Deploy", icon: Lock },
      { value: "unlockDeploy", label: "Unlock Deploy", icon: Unlock },
      { value: "listDeployFiles", label: "Deploy Files", icon: Files },
    ],
  },
  {
    title: "Builds & Functions",
    ops: [
      { value: "triggerBuild", label: "Trigger Build", icon: Hammer },
      { value: "listBuilds", label: "List Builds", icon: History },
      { value: "getBuild", label: "Get Build", icon: FileText },
      { value: "listFunctions", label: "List Functions", icon: FunctionSquare },
    ],
  },
  {
    title: "Forms",
    ops: [
      { value: "listForms", label: "List Forms", icon: ClipboardList },
      { value: "listSubmissions", label: "Submissions", icon: Inbox },
      { value: "deleteSubmission", label: "Delete Submission", icon: Trash2 },
    ],
  },
  {
    title: "Env Vars",
    ops: [
      { value: "listEnvVars", label: "List Env Vars", icon: Variable },
      { value: "getEnvVar", label: "Get Env Var", icon: FileText },
      { value: "setEnvVar", label: "Set Env Var", icon: Plus },
      { value: "deleteEnvVar", label: "Delete Env Var", icon: Trash2 },
    ],
  },
  {
    title: "DNS",
    ops: [
      { value: "listDnsZones", label: "List Zones", icon: Globe },
      { value: "getDnsZone", label: "Get Zone", icon: FileText },
      { value: "listDnsRecords", label: "List Records", icon: Network },
      { value: "createDnsRecord", label: "Create Record", icon: Plus },
      { value: "deleteDnsRecord", label: "Delete Record", icon: Trash2 },
    ],
  },
  {
    title: "Hooks & Account",
    ops: [
      { value: "listHooks", label: "List Hooks", icon: Webhook },
      { value: "createHook", label: "Create Hook", icon: Plus },
      { value: "deleteHook", label: "Delete Hook", icon: Trash2 },
      { value: "listAccounts", label: "List Accounts", icon: Building2 },
      { value: "listAccountMembers", label: "Members", icon: Users },
      { value: "getCurrentUser", label: "Current User", icon: User },
    ],
  },
];

const ENV_CONTEXTS = ["production", "deploy-preview", "branch-deploy", "dev"];
const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS"];
const GIT_PROVIDERS = ["github", "gitlab", "bitbucket"];

const lbl = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
const inputCls =
  "w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#00AD9F]/40";

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={lbl}>{label}</span>
      {children}
      {hint && <span className="text-[10px] text-zinc-600">{hint}</span>}
    </div>
  );
}

const SITE_OPS = [
  "getSite", "updateSite", "deleteSite", "listDeploys", "createDeploy", "restoreDeploy",
  "triggerBuild", "listBuilds", "listFunctions", "listForms", "listEnvVars", "setEnvVar",
  "deleteEnvVar", "listHooks", "createHook",
];
const DEPLOY_OPS = ["getDeploy", "cancelDeploy", "restoreDeploy", "lockDeploy", "unlockDeploy", "listDeployFiles"];
const ZONE_OPS = ["getDnsZone", "listDnsRecords", "createDnsRecord", "deleteDnsRecord"];
const ACCOUNT_OPS = ["createSite", "listEnvVars", "getEnvVar", "listAccountMembers"];

export default function NetlifyNode({ config = {}, updateConfig }) {
  const op = config.operation || "listSites";
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
                ? "bg-[#00AD9F]/10 border-[#00AD9F]/40 text-[#2dd4c4]"
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
        <div className="w-8 h-8 rounded-lg bg-[#00AD9F]/10 border border-[#00AD9F]/25 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 128 128" className="w-4 h-4" fill="#00AD9F">
            <path d="M34.6 94.3l1.1.1 12.4-5.2.5-1-.5-7.7-1.5-1.5-7.7-.3-2.9 2.9-1.4 8.6 1.4 4.6zm-3-21.2l8.2.3.9-.7v-1.6l1.7-12.4-.6-2.2-5.3-3-3.4-1.9-2.6-1.5-2.9 8.3-3 8.6 1.9 9 4.2-.5.4-.4zm49.8 1.6l-.5-.9-7.7-6.9-1.6-.1-6.1 3.9-.5 1.4 6.4 16.6 1.1.5 12.7-5.4.5-1-3.7-5.6-1-1.9zm21.3-23.6l-2.6-8.1-13.4 2.2-1 .9-2.7 19.8.7 1.4 4.9 1.7 3.3-.6 8.3-12.5.5-4.2v-.6zm-43.3-7.7l1.4-.3 9.7-6.5.4-1.2-3.5-15.6-1.4-.7-13.1 5.6-.5 1.1 6.2 13.2.4.4-.1.3 1.4 1.1z"/>
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Netlify</div>
          <div className="text-[11px] text-zinc-500">Sites, deploys, builds, DNS, forms</div>
        </div>
      </div>

      <Field label="Credential" hint="Netlify Personal Access Token.">
        <CredentialPicker
          provider="netlify"
          value={config.credentialId || ""}
          onChange={set("credentialId")}
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
                    onClick={() => updateConfig("operation", o.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all duration-150 ${
                      active
                        ? "bg-[#00AD9F]/10 border-[#00AD9F]/40 text-[#2dd4c4]"
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

      {SITE_OPS.includes(op) && (
        <Field label="Site ID">
          <Var k="siteId" placeholder="{{ $json.site_id }}" />
        </Field>
      )}

      {DEPLOY_OPS.includes(op) && (
        <Field label="Deploy ID">
          <Var k="deployId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {ACCOUNT_OPS.includes(op) && (
        <Field label="Account Slug" hint="Found in your Netlify team URL.">
          <Var k="accountSlug" placeholder="my-team" />
        </Field>
      )}

      {show("createSite", "updateSite") && (
        <>
          <Field label="Site Name" hint="Subdomain on netlify.app.">
            <Var k="name" placeholder="my-cool-site" />
          </Field>
          <Field label="Custom Domain" hint="Optional.">
            <Var k="customDomain" placeholder="www.example.com" />
          </Field>
          <Field label="Build Command" hint="Optional.">
            <Var k="buildCommand" placeholder="npm run build" />
          </Field>
          <Field label="Publish Directory" hint="Optional.">
            <Var k="publishDir" placeholder="dist" />
          </Field>
        </>
      )}

      {show("createSite") && (
        <>
          <Field label="Git Repo URL" hint="Optional — connect a repo.">
            <Var k="repoUrl" placeholder="https://github.com/org/repo" />
          </Field>
          <Field label="Git Provider">
            <Pills k="gitProvider" items={GIT_PROVIDERS} def="github" />
          </Field>
        </>
      )}

      {show("createDeploy", "triggerBuild", "createSite") && (
        <Field label="Branch" hint="Optional.">
          <Var k="branch" placeholder="main" />
        </Field>
      )}

      {show("createDeploy") && (
        <Field label="Deploy Title" hint="Optional.">
          <Var k="message" placeholder="Deploy from Blinkbox" />
        </Field>
      )}

      {show("getBuild") && (
        <Field label="Build ID">
          <Var k="buildId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {show("listSubmissions") && (
        <Field label="Form ID">
          <Var k="formId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {show("deleteSubmission") && (
        <Field label="Submission ID">
          <Var k="submissionId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {show("getEnvVar", "setEnvVar", "deleteEnvVar") && (
        <Field label="Key">
          <Var k="key" placeholder="API_KEY" />
        </Field>
      )}

      {show("setEnvVar") && (
        <>
          <Field label="Value" hint="Encrypted at rest by Netlify.">
            <Var k="value" placeholder="{{ $json.secret }}" />
          </Field>
          <Field label="Context">
            <Pills k="context" items={ENV_CONTEXTS} def="production" />
          </Field>
        </>
      )}

      {ZONE_OPS.includes(op) && (
        <Field label="DNS Zone ID">
          <Var k="zoneId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {show("createDnsRecord") && (
        <>
          <Field label="Record Type">
            <Pills k="recordType" items={DNS_TYPES} def="A" />
          </Field>
          <Field label="Hostname">
            <Var k="recordHostname" placeholder="www.example.com" />
          </Field>
          <Field label="Value">
            <Var k="recordValue" placeholder="76.76.21.21" />
          </Field>
          <Field label="TTL" hint="Optional — seconds.">
            <Var k="ttl" placeholder="3600" />
          </Field>
        </>
      )}

      {show("deleteDnsRecord") && (
        <Field label="Record ID">
          <Var k="recordId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {show("createHook") && (
        <>
          <Field label="Hook Type" hint="e.g. url, github_commit_status.">
            <Var k="hookType" placeholder="url" />
          </Field>
          <Field label="Event" hint="e.g. deploy_created, deploy_failed.">
            <Var k="hookEvent" placeholder="deploy_created" />
          </Field>
          <Field label="Hook URL" hint="For url-type hooks.">
            <Var k="hookUrl" placeholder="https://hooks.example.com/notify" />
          </Field>
        </>
      )}

      {show("deleteHook") && (
        <Field label="Hook ID">
          <Var k="hookId" placeholder="{{ $json.id }}" />
        </Field>
      )}

      {show("listSites", "listDeploys", "listBuilds", "listSubmissions") && (
        <Field label="Limit" hint="Max results.">
          <input
            type="number"
            min="1"
            max="100"
            value={config.limit ?? 20}
            onChange={(e) => updateConfig("limit", e.target.value)}
            className={inputCls}
          />
        </Field>
      )}
    </div>
  );
}
