import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "createIssue",   label: "Create Issue" },
  { value: "updateIssue",   label: "Update Issue" },
  { value: "commentIssue",  label: "Comment on Issue" },
  { value: "createMR",      label: "Create Merge Request" },
  { value: "mergeMR",       label: "Merge MR" },
  { value: "triggerPipeline", label: "Trigger Pipeline" },
  { value: "getProject",    label: "Get Project Info" },
  { value: "listIssues",    label: "List Issues" },
];

export default function GitLabNode({ config = {}, updateConfig }) {
  const op = config.operation || "createIssue";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#FC6D26]/10 border border-[#FC6D26]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#FC6D26">
            <path d="M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 00-.867 0L16.418 9.45H7.582L4.918 1.263a.455.455 0 00-.867 0L1.387 9.449.045 13.587a.924.924 0 00.331 1.023L12 23.054l11.624-8.443a.92.92 0 00.331-1.024"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">GitLab</div>
          <div className="text-[11px] text-zinc-500">Issues, MRs, pipelines, projects</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#FC6D26]/10 border-[#FC6D26]/40 text-[#FC6D26]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Project ID or namespace/name</label>
        <SmartVariableInput value={config.project || ""} onChange={(v) => updateConfig("project", v)} placeholder="acme/my-project or 12345" />
      </div>

      {["createIssue","updateIssue","commentIssue"].includes(op) && op !== "createIssue" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Issue IID</label>
          <SmartVariableInput value={config.issueIid || ""} onChange={(v) => updateConfig("issueIid", v)} placeholder="{{ $json.iid }}" />
        </div>
      )}

      {(op === "createIssue" || op === "updateIssue") && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Title</label>
            <SmartVariableInput value={config.title || ""} onChange={(v) => updateConfig("title", v)} placeholder="Issue title" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Description</label>
            <SmartVariableInput value={config.description || ""} onChange={(v) => updateConfig("description", v)} placeholder="Describe the issue..." multiline />
          </div>
        </>
      )}

      {op === "commentIssue" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Comment</label>
          <SmartVariableInput value={config.body || ""} onChange={(v) => updateConfig("body", v)} placeholder="Thanks for the report, fixed in {{ $json.commit }}" multiline />
        </div>
      )}

      {op === "createMR" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Title</label>
            <SmartVariableInput value={config.title || ""} onChange={(v) => updateConfig("title", v)} placeholder="feat: my new feature" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Source Branch</label>
              <SmartVariableInput value={config.sourceBranch || ""} onChange={(v) => updateConfig("sourceBranch", v)} placeholder="feature/my-branch" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Target Branch</label>
              <SmartVariableInput value={config.targetBranch || "main"} onChange={(v) => updateConfig("targetBranch", v)} placeholder="main" />
            </div>
          </div>
        </>
      )}

      {op === "triggerPipeline" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Ref (branch/tag)</label>
            <SmartVariableInput value={config.ref || "main"} onChange={(v) => updateConfig("ref", v)} placeholder="main" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Variables (JSON object, optional)</label>
            <SmartVariableInput value={config.variables || ""} onChange={(v) => updateConfig("variables", v)} placeholder='{"ENV": "production"}' />
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="orange" label="GitLab Personal Access Token" placeholder="Select GitLab credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, iid, title, web_url, state</span>
      </div>
    </div>
  );
}
