import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "createWorkItem",  label: "Create Work Item" },
  { value: "updateWorkItem",  label: "Update Work Item" },
  { value: "getWorkItem",     label: "Get Work Item" },
  { value: "listWorkItems",   label: "Query Work Items" },
  { value: "triggerPipeline", label: "Run Pipeline" },
  { value: "getPipeline",     label: "Get Pipeline Run" },
  { value: "createRepo",      label: "Create Repository" },
  { value: "listRepos",       label: "List Repositories" },
];

const WORK_ITEM_TYPES = ["Bug","Task","User Story","Feature","Epic","Issue","Test Case"];
const STATES = ["Active","Resolved","Closed","New","To Do","Doing","Done"];

export default function AzureDevOpsNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "createWorkItem";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#0078D4]/10 border border-[#0078D4]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#0078D4">
            <path d="M0 5.065v13.87l4.348 3.826 8.217-3.13V22l4.13-4.13L22 16.413V2.63L16.478 0 8.217 3.174V0L0 5.065zm4.348 11.304l-2.174-1.826V6.826L4.348 5.13v11.239zm4.87 2.37L4.87 16.565V5.087l4.348-1.956v15.608zm11.13-3.13l-5.217 1.304-2.826-1.63V4.695l8.043 3.043v7.87z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Azure DevOps</div>
          <div className="text-[11px] text-zinc-500">Work items, pipelines, repos</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#0078D4]/10 border-[#0078D4]/40 text-[#0078D4]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Organization</label>
          <SmartVariableInput value={config.org || ""} onChange={(v) => updateConfig("org", v)} placeholder="my-org" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Project</label>
          <SmartVariableInput value={config.project || ""} onChange={(v) => updateConfig("project", v)} placeholder="MyProject" />
        </div>
      </div>

      {["updateWorkItem","getWorkItem"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Work Item ID</label>
          <SmartVariableInput value={config.workItemId || ""} onChange={(v) => updateConfig("workItemId", v)} placeholder="{{ $json.id }}" />
        </div>
      )}

      {op === "createWorkItem" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Work Item Type</label>
            <div className="flex gap-1 flex-wrap">
              {WORK_ITEM_TYPES.map((t) => (
                <button key={t} onClick={() => updateConfig("workItemType", t)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${(config.workItemType||"Task") === t ? "bg-[#0078D4]/10 border-[#0078D4]/40 text-[#0078D4]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Title</label>
            <SmartVariableInput value={config.title || ""} onChange={(v) => updateConfig("title", v)} placeholder="{{ $json.title }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Description</label>
            <SmartVariableInput value={config.description || ""} onChange={(v) => updateConfig("description", v)} placeholder="Work item description..." multiline />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Assigned To (email)</label>
            <SmartVariableInput value={config.assignedTo || ""} onChange={(v) => updateConfig("assignedTo", v)} placeholder="{{ $json.assigneeEmail }}" />
          </div>
        </>
      )}

      {op === "updateWorkItem" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">New State</label>
            <div className="flex gap-1 flex-wrap">
              {STATES.map((s) => (
                <button key={s} onClick={() => updateConfig("state", s)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${config.state === s ? "bg-[#0078D4]/10 border-[#0078D4]/40 text-[#0078D4]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Comment (optional)</label>
            <SmartVariableInput value={config.comment || ""} onChange={(v) => updateConfig("comment", v)} placeholder="Status updated automatically" />
          </div>
        </>
      )}

      {op === "triggerPipeline" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Pipeline ID</label>
            <SmartVariableInput value={config.pipelineId || ""} onChange={(v) => updateConfig("pipelineId", v)} placeholder="42" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Branch</label>
            <SmartVariableInput value={config.branch || "main"} onChange={(v) => updateConfig("branch", v)} placeholder="main" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Variables (JSON, optional)</label>
            <SmartVariableInput value={config.variables || ""} onChange={(v) => updateConfig("variables", v)} placeholder='{"DEPLOY_ENV":"production"}' />
          </div>
        </>
      )}

      {op === "listWorkItems" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">WIQL Query</label>
          <SmartVariableInput value={config.query || ""} onChange={(v) => updateConfig("query", v)} placeholder="SELECT [Id],[Title] FROM WorkItems WHERE [State] = 'Active'" multiline />
        </div>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Azure DevOps Personal Access Token" placeholder="Select Azure DevOps credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, rev, fields, url</span>
      </div>
    </div>
  );
}
