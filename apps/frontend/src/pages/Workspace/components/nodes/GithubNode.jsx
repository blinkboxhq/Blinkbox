import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "listIssues",    label: "List Issues" },
  { value: "getIssue",      label: "Get Issue" },
  { value: "createIssue",   label: "Create Issue" },
  { value: "createComment", label: "Add Comment" },
  { value: "listPRs",       label: "List Pull Requests" },
  { value: "createPR",      label: "Create PR" },
  { value: "mergePR",       label: "Merge PR" },
  { value: "getRepo",       label: "Get Repo Info" },
  { value: "createRelease", label: "Create Release" },
];

export default function GithubNode({ config = {}, updateConfig }) {
  const op = config.operation || "listIssues";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-zinc-500/5 border border-zinc-500/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-zinc-200">GitHub</span>
          <span className="text-[10px] text-zinc-500">Issues, PRs, releases, and more</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-1.5">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-2 rounded-lg border text-xs font-bold transition-all ${op === o.value ? "bg-zinc-500/20 border-zinc-400/40 text-zinc-200" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Owner</label>
          <SmartVariableInput value={config.owner || ""} onChange={(v) => updateConfig("owner", v)} placeholder="octocat" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Repository</label>
          <SmartVariableInput value={config.repo || ""} onChange={(v) => updateConfig("repo", v)} placeholder="my-repo" />
        </div>
      </div>

      {["getIssue", "createComment"].includes(op) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Issue Number</label>
          <SmartVariableInput value={config.issueNumber || ""} onChange={(v) => updateConfig("issueNumber", v)} placeholder="42" />
        </div>
      )}

      {op === "createIssue" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Title</label>
            <SmartVariableInput value={config.title || ""} onChange={(v) => updateConfig("title", v)} placeholder="Bug: something is broken" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Body</label>
            <SmartVariableInput value={config.body || ""} onChange={(v) => updateConfig("body", v)} placeholder="{{n1.errorDetails}}" multiline />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Labels (comma-separated)</label>
            <SmartVariableInput value={config.labels || ""} onChange={(v) => updateConfig("labels", v)} placeholder="bug, help wanted" />
          </div>
        </>
      )}

      {op === "createComment" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Comment</label>
          <SmartVariableInput value={config.body || ""} onChange={(v) => updateConfig("body", v)} placeholder="{{n1.summary}}" multiline />
        </div>
      )}

      {op === "createPR" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Title</label>
            <SmartVariableInput value={config.title || ""} onChange={(v) => updateConfig("title", v)} placeholder="feat: add new feature" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Head Branch</label>
              <SmartVariableInput value={config.head || ""} onChange={(v) => updateConfig("head", v)} placeholder="feature/my-branch" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Base Branch</label>
              <SmartVariableInput value={config.base || "main"} onChange={(v) => updateConfig("base", v)} placeholder="main" />
            </div>
          </div>
        </>
      )}

      {op === "mergePR" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">PR Number</label>
          <SmartVariableInput value={config.prNumber || ""} onChange={(v) => updateConfig("prNumber", v)} placeholder="{{n1.number}}" />
        </div>
      )}

      {op === "createRelease" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tag Name</label>
            <SmartVariableInput value={config.tagName || ""} onChange={(v) => updateConfig("tagName", v)} placeholder="v1.2.0" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Release Notes</label>
            <SmartVariableInput value={config.body || ""} onChange={(v) => updateConfig("body", v)} placeholder="{{n1.changelog}}" multiline />
          </div>
        </>
      )}

      {["listIssues", "listPRs"].includes(op) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">State</label>
          <div className="grid grid-cols-3 gap-1.5">
            {["open", "closed", "all"].map((s) => (
              <button key={s} onClick={() => updateConfig("state", s)}
                className={`py-2 rounded-lg border text-xs font-bold capitalize transition-all ${(config.state || "open") === s ? "bg-zinc-500/20 border-zinc-400/40 text-zinc-200" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="zinc" label="GitHub Personal Access Token" placeholder="Select GitHub credential..." />
    </div>
  );
}
