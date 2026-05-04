import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "listIssues",    label: "List Issues" },
  { value: "getIssue",      label: "Get Issue" },
  { value: "resolveIssue",  label: "Resolve Issue" },
  { value: "ignoreIssue",   label: "Ignore Issue" },
  { value: "assignIssue",   label: "Assign Issue" },
  { value: "listEvents",    label: "List Events" },
  { value: "createProject", label: "Create Project" },
  { value: "listProjects",  label: "List Projects" },
];

export default function SentryNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "listIssues";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#FB4226]/10 border border-[#FB4226]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#FB4226">
            <path d="M14.707 2.293a1 1 0 00-1.414 0L12 3.586 3.293 12.293A1 1 0 002 13v8a1 1 0 001 1h8a1 1 0 00.707-.293L14.707 18.7a1 1 0 000-1.414L12.414 15l2.293-2.293a1 1 0 000-1.414L12.414 9l2.293-2.293a1 1 0 000-1.414z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Sentry</div>
          <div className="text-[11px] text-zinc-500">Issues, events, projects, alerts</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#FB4226]/10 border-[#FB4226]/40 text-[#FB4226]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Organization Slug</label>
          <SmartVariableInput value={config.org || ""} onChange={(v) => updateConfig("org", v)} placeholder="my-org" />
        </div>
        {!["createProject","listProjects"].includes(op) && (
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Project Slug</label>
            <SmartVariableInput value={config.project || ""} onChange={(v) => updateConfig("project", v)} placeholder="my-app" />
          </div>
        )}
      </div>

      {["getIssue","resolveIssue","ignoreIssue","assignIssue"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Issue ID</label>
          <SmartVariableInput value={config.issueId || ""} onChange={(v) => updateConfig("issueId", v)} placeholder="{{ $json.id }}" />
        </div>
      )}

      {op === "listIssues" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Status Filter</label>
            <div className="flex gap-1.5">
              {["all","unresolved","resolved","ignored"].map((s) => (
                <button key={s} onClick={() => updateConfig("status", s)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${(config.status||"unresolved") === s ? "bg-[#FB4226]/10 border-[#FB4226]/40 text-[#FB4226]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Limit</label>
            <SmartVariableInput value={config.limit || "25"} onChange={(v) => updateConfig("limit", v)} placeholder="25" />
          </div>
        </>
      )}

      {op === "assignIssue" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Assignee (username or email)</label>
          <SmartVariableInput value={config.assignee || ""} onChange={(v) => updateConfig("assignee", v)} placeholder="{{ $json.oncallEngineer }}" />
        </div>
      )}

      {op === "createProject" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Team Slug</label>
            <SmartVariableInput value={config.team || ""} onChange={(v) => updateConfig("team", v)} placeholder="backend" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Project Name</label>
            <SmartVariableInput value={config.name || ""} onChange={(v) => updateConfig("name", v)} placeholder="{{ $json.repoName }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Platform</label>
            <SmartVariableInput value={config.platform || "node"} onChange={(v) => updateConfig("platform", v)} placeholder="node / react / python ..." />
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="red" label="Sentry Auth Token" placeholder="Select Sentry credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, title, status, count, firstSeen, lastSeen</span>
      </div>
    </div>
  );
}
