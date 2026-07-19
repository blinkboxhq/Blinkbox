import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "createTask",    label: "Create Task" },
  { value: "updateTask",    label: "Update Task" },
  { value: "completeTask",  label: "Complete Task" },
  { value: "getTask",       label: "Get Task" },
  { value: "listTasks",     label: "List Tasks" },
  { value: "addComment",    label: "Add Comment" },
  { value: "createProject", label: "Create Project" },
  { value: "listProjects",  label: "List Projects" },
];

export default function AsanaNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "createTask";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#F06A6A]/10 border border-[#F06A6A]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#F06A6A">
            <path d="M18.363 10.91a5.636 5.636 0 1 1 0 11.272 5.636 5.636 0 0 1 0-11.272zM5.637 10.91a5.636 5.636 0 1 1 0 11.271 5.636 5.636 0 0 1 0-11.272zm6.364-9.092a5.636 5.636 0 1 1 0 11.272 5.636 5.636 0 0 1 0-11.272z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Asana</div>
          <div className="text-[11px] text-zinc-500">Tasks, projects, comments, teams</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#F06A6A]/10 border-[#F06A6A]/40 text-[#F06A6A]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["updateTask","completeTask","getTask","addComment"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Task GID</label>
          <SmartVariableInput value={config.taskGid || ""} onChange={(v) => updateConfig("taskGid", v)} placeholder="{{ $json.gid }}" />
        </div>
      )}

      {(op === "createTask" || op === "updateTask") && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Task Name</label>
            <SmartVariableInput value={config.name || ""} onChange={(v) => updateConfig("name", v)} placeholder="Follow up with {{ $json.contact }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Notes (optional)</label>
            <SmartVariableInput value={config.notes || ""} onChange={(v) => updateConfig("notes", v)} placeholder="Additional context..." multiline />
          </div>
          {op === "createTask" && (
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Project GID</label>
              <SmartVariableInput value={config.projectGid || ""} onChange={(v) => updateConfig("projectGid", v)} placeholder="Project GID from Asana URL" />
            </div>
          )}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Due Date (YYYY-MM-DD)</label>
            <SmartVariableInput value={config.dueOn || ""} onChange={(v) => updateConfig("dueOn", v)} placeholder="{{ $json.deadline }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Assignee (GID or email)</label>
            <SmartVariableInput value={config.assignee || ""} onChange={(v) => updateConfig("assignee", v)} placeholder="me or {{ $json.assigneeEmail }}" />
          </div>
        </>
      )}

      {op === "listTasks" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Project GID</label>
          <SmartVariableInput value={config.projectGid || ""} onChange={(v) => updateConfig("projectGid", v)} placeholder="Project GID" />
        </div>
      )}

      {op === "addComment" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Comment Text</label>
          <SmartVariableInput value={config.text || ""} onChange={(v) => updateConfig("text", v)} placeholder="{{ $json.note }}" multiline />
        </div>
      )}

      {op === "createProject" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Project Name</label>
            <SmartVariableInput value={config.name || ""} onChange={(v) => updateConfig("name", v)} placeholder="Q3 Campaign" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Team GID</label>
            <SmartVariableInput value={config.teamGid || ""} onChange={(v) => updateConfig("teamGid", v)} placeholder="Team GID" />
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Asana Personal Access Token" placeholder="Select Asana credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">gid, name, permalink_url, completed, due_on</span>
      </div>
    </div>
  );
}
