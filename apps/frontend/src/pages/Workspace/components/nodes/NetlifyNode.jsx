import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "triggerBuild",    label: "Trigger Build" },
  { value: "listDeploys",     label: "List Deploys" },
  { value: "getDeploy",       label: "Get Deploy" },
  { value: "cancelDeploy",    label: "Cancel Deploy" },
  { value: "lockDeploy",      label: "Lock / Unlock Deploy" },
  { value: "listSites",       label: "List Sites" },
  { value: "getSite",         label: "Get Site Info" },
  { value: "updateEnvVar",    label: "Update Env Variable" },
];

export default function NetlifyNode({ config = {}, updateConfig }) {
  const op = config.operation || "triggerBuild";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#00C7B7]/10 border border-[#00C7B7]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#00C7B7">
            <path d="M16.934 8.519a1.044 1.044 0 01.303.23l2.349-1.045-2.192-2.171-.491 2.954zM12.06.64L9.987 3.95l2.358 2.358L15.055 5.1 12.06.64zm-5.13 4.66l-1.905-.95L4.06 6.22l2.378.572.492-1.492zM21.784 12l-2.025-.602-1.74 1.74 1.53 1.53L21.784 12zM12.06 23.36l3.164-4.782-2.732-2.732-3.31 3.309 2.878 4.205zm9.724-11.36l-2.255 2.255 1.74 1.74 2.025-.602L21.784 12zm-9.724-9.595L9.192 5.013 11.55 7.372l3.505-2.027L12.06 2.405zM7.457 12.818l-3.34 3.34 2.034 2.034 3.34-3.34-2.034-2.034zm-5.21 2.477l2.1-2.1.59 2.1-2.69 2.69-2.1.59 2.1-2.1zm12.784-6.85l-4.688 2.71 2.034 2.034 4.688-2.71-2.034-2.034z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Netlify</div>
          <div className="text-[11px] text-zinc-500">Builds, deploys, sites, env vars</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#00C7B7]/10 border-[#00C7B7]/40 text-[#00C7B7]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {!["listSites"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Site ID</label>
          <SmartVariableInput value={config.siteId || ""} onChange={(v) => updateConfig("siteId", v)} placeholder="{{ $json.siteId }} or site name" />
        </div>
      )}

      {["getDeploy","cancelDeploy","lockDeploy"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Deploy ID</label>
          <SmartVariableInput value={config.deployId || ""} onChange={(v) => updateConfig("deployId", v)} placeholder="{{ $json.id }}" />
        </div>
      )}

      {op === "lockDeploy" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Action</label>
          <div className="flex gap-1.5">
            {["lock","unlock"].map((a) => (
              <button key={a} onClick={() => updateConfig("lockAction", a)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(config.lockAction||"lock") === a ? "bg-[#00C7B7]/10 border-[#00C7B7]/40 text-[#00C7B7]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
      )}

      {op === "updateEnvVar" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Variable Key</label>
            <SmartVariableInput value={config.key || ""} onChange={(v) => updateConfig("key", v)} placeholder="API_URL" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Value</label>
            <SmartVariableInput value={config.value || ""} onChange={(v) => updateConfig("value", v)} placeholder="{{ $json.apiUrl }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Context</label>
            <div className="flex gap-1.5">
              {["all","production","deploy-preview","branch-deploy"].map((c) => (
                <button key={c} onClick={() => updateConfig("context", c)}
                  className={`flex-1 py-1.5 rounded-lg text-[8px] font-bold border transition-all ${(config.context||"all") === c ? "bg-[#00C7B7]/10 border-[#00C7B7]/40 text-[#00C7B7]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {c === "all" ? "All" : c === "production" ? "Prod" : c === "deploy-preview" ? "Preview" : "Branch"}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="teal" label="Netlify Personal Access Token" placeholder="Select Netlify credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, state, url, created_at, deploy_time</span>
      </div>
    </div>
  );
}
