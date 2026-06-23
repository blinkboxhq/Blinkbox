import { GitBranch } from "lucide-react";
import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "searchIssues",    label: "Search Issues (JQL)" },
  { value: "getIssue",        label: "Get Issue" },
  { value: "createIssue",     label: "Create Issue" },
  { value: "updateIssue",     label: "Update Issue" },
  { value: "transitionIssue", label: "Transition Status" },
  { value: "addComment",      label: "Add Comment" },
  { value: "listProjects",    label: "List Projects" },
];

const PRIORITIES = ["Highest", "High", "Medium", "Low", "Lowest"];

export default function JiraNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "searchIssues";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#0052CC]/5 border border-[#0052CC]/20 rounded-xl">
        <div className="p-2 bg-[#0052CC]/10 rounded-lg border border-[#0052CC]/20 shrink-0 flex items-center justify-center">
          <GitBranch className="w-5 h-5 text-[#2684FF]" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#2684FF]">Jira</span>
          <span className="text-[10px] text-zinc-500">Issues, comments, transitions, projects</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Jira Domain</label>
        <input value={config.domain || ""} onChange={(e) => updateConfig("domain", e.target.value)}
          placeholder="mycompany.atlassian.net"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#2684FF]/40" />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-1.5">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-2 rounded-lg border text-xs font-bold transition-all ${op === o.value ? "bg-[#0052CC]/10 border-[#2684FF]/40 text-[#2684FF]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {op === "searchIssues" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">JQL Query</label>
            <SmartVariableInput value={config.jql || ""} onChange={(v) => updateConfig("jql", v)}
              placeholder='project = MYPROJ AND status = "To Do" ORDER BY created DESC' multiline />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Limit</label>
            <input type="number" min="1" max="100" value={config.limit || 20} onChange={(e) => updateConfig("limit", Number(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#2684FF]/40" />
          </div>
        </>
      )}

      {["getIssue", "updateIssue", "transitionIssue", "addComment"].includes(op) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Issue Key</label>
          <SmartVariableInput value={config.issueKey || ""} onChange={(v) => updateConfig("issueKey", v)} placeholder="PROJ-123" />
        </div>
      )}

      {op === "createIssue" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Project Key</label>
            <SmartVariableInput value={config.project || ""} onChange={(v) => updateConfig("project", v)} placeholder="PROJ" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Issue Type</label>
            <input value={config.issueType || "Task"} onChange={(e) => updateConfig("issueType", e.target.value)}
              placeholder="Task"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#2684FF]/40" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Summary</label>
            <SmartVariableInput value={config.summary || ""} onChange={(v) => updateConfig("summary", v)} placeholder="{{n1.title}}" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description</label>
            <SmartVariableInput value={config.description || ""} onChange={(v) => updateConfig("description", v)} placeholder="{{n1.body}}" multiline />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Priority</label>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITIES.map((p) => (
                <button key={p} onClick={() => updateConfig("priority", p)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${config.priority === p ? "bg-[#0052CC]/10 border-[#2684FF]/40 text-[#2684FF]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {op === "addComment" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Comment</label>
          <SmartVariableInput value={config.comment || ""} onChange={(v) => updateConfig("comment", v)} placeholder="{{n1.message}}" multiline />
        </div>
      )}

      {op === "transitionIssue" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Transition ID</label>
          <SmartVariableInput value={config.transitionId || ""} onChange={(v) => updateConfig("transitionId", v)} placeholder="21" />
          <p className="text-[10px] text-zinc-600">Get transition IDs from GET /rest/api/3/issue/PROJ-1/transitions</p>
        </div>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Jira API Token (email:token)" placeholder="Select Jira credential..." />
    </div>
  );
}
