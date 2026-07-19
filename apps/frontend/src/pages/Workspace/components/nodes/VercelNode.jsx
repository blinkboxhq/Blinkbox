import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "listDeployments", label: "List Deployments" },
  { value: "getDeployment",   label: "Get Deployment" },
  { value: "triggerDeploy",   label: "Trigger Deployment" },
  { value: "cancelDeploy",    label: "Cancel Deployment" },
  { value: "listProjects",    label: "List Projects" },
  { value: "listDomains",     label: "List Domains" },
  { value: "addDomain",       label: "Add Domain" },
  { value: "getEnvVars",      label: "Get Env Variables" },
];

export default function VercelNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "listDeployments";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="white">
            <path d="M12 1L1 21h22L12 1z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Vercel</div>
          <div className="text-[11px] text-zinc-500">Deployments, domains, env vars</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-zinc-700/50 border-zinc-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["listDeployments","triggerDeploy","listDomains","addDomain","getEnvVars"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Project Name or ID</label>
          <SmartVariableInput nodeId={nodeId} value={config.projectId || ""} onChange={(v) => updateConfig("projectId", v)} placeholder="my-next-app" />
        </div>
      )}

      {["getDeployment","cancelDeploy"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Deployment ID</label>
          <SmartVariableInput nodeId={nodeId} value={config.deploymentId || ""} onChange={(v) => updateConfig("deploymentId", v)} placeholder="dpl_{{ $json.id }}" />
        </div>
      )}

      {op === "triggerDeploy" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Git Branch</label>
            <SmartVariableInput nodeId={nodeId} value={config.branch || "main"} onChange={(v) => updateConfig("branch", v)} placeholder="main" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Target Environment</label>
            <div className="flex gap-1.5">
              {["production","preview","development"].map((e) => (
                <button key={e} onClick={() => updateConfig("target", e)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${(config.target||"production") === e ? "bg-zinc-700/50 border-zinc-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {op === "listDeployments" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">State Filter</label>
            <div className="flex gap-1 flex-wrap">
              {["all","READY","ERROR","BUILDING","QUEUED","CANCELED"].map((s) => (
                <button key={s} onClick={() => updateConfig("stateFilter", s)}
                  className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all ${(config.stateFilter||"all") === s ? "bg-zinc-700/50 border-zinc-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Limit</label>
            <SmartVariableInput nodeId={nodeId} value={config.limit || "10"} onChange={(v) => updateConfig("limit", v)} placeholder="10" />
          </div>
        </>
      )}

      {op === "addDomain" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Domain Name</label>
          <SmartVariableInput nodeId={nodeId} value={config.domain || ""} onChange={(v) => updateConfig("domain", v)} placeholder="app.mycompany.com" />
        </div>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Vercel API Token" placeholder="Select Vercel credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">uid, url, state, createdAt, target, alias</span>
      </div>
    </div>
  );
}
