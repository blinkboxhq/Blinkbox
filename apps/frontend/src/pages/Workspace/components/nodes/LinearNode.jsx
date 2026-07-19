import { CheckSquare } from "lucide-react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "listIssues",    label: "List Issues" },
  { value: "getIssue",      label: "Get Issue" },
  { value: "createIssue",   label: "Create Issue" },
  { value: "updateIssue",   label: "Update Issue" },
  { value: "createComment", label: "Add Comment" },
  { value: "listTeams",     label: "List Teams" },
];

const PRIORITIES = [
  { value: "0", label: "No priority" },
  { value: "1", label: "Urgent" },
  { value: "2", label: "High" },
  { value: "3", label: "Medium" },
  { value: "4", label: "Low" },
];

export default function LinearNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "listIssues";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#5E6AD2]/5 border border-[#5E6AD2]/20 rounded-xl">
        <div className="p-2 bg-[#5E6AD2]/10 rounded-lg border border-[#5E6AD2]/20 shrink-0 flex items-center justify-center">
          <CheckSquare className="w-5 h-5 text-[#5E6AD2]" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#5E6AD2]">Linear</span>
          <span className="text-[10px] text-zinc-500">Issues, comments, and teams</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-1.5">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-2 rounded-lg border text-xs font-bold transition-all ${op === o.value ? "bg-[#5E6AD2]/10 border-[#5E6AD2]/40 text-[#5E6AD2]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["listIssues", "createIssue"].includes(op) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Team ID</label>
          <SmartVariableInput value={config.teamId || ""} onChange={(v) => updateConfig("teamId", v)} placeholder="{{n1.teamId}}" />
          <p className="text-[10px] text-zinc-600">Get team IDs from "List Teams" operation</p>
        </div>
      )}

      {["getIssue", "updateIssue", "createComment"].includes(op) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Issue ID or Identifier</label>
          <SmartVariableInput value={config.issueId || ""} onChange={(v) => updateConfig("issueId", v)} placeholder="ENG-123  or  uuid" />
        </div>
      )}

      {["createIssue", "updateIssue"].includes(op) && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Title</label>
            <SmartVariableInput value={config.title || ""} onChange={(v) => updateConfig("title", v)} placeholder="{{n1.summary}}" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description</label>
            <SmartVariableInput value={config.description || ""} onChange={(v) => updateConfig("description", v)} placeholder="{{n1.body}}" multiline />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Priority</label>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITIES.map((p) => (
                <button key={p.value} onClick={() => updateConfig("priority", p.value)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${config.priority === p.value ? "bg-[#5E6AD2]/10 border-[#5E6AD2]/40 text-[#5E6AD2]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {op === "createComment" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Comment</label>
          <SmartVariableInput value={config.body || ""} onChange={(v) => updateConfig("body", v)} placeholder="{{n1.message}}" multiline />
        </div>
      )}

      {op === "listIssues" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Limit</label>
          <input type="number" min="1" max="100" value={config.limit || 25} onChange={(e) => updateConfig("limit", Number(e.target.value))}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#5E6AD2]/40" />
        </div>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Linear API Key (lin_api_...)" placeholder="Select Linear credential..." />
    </div>
  );
}
