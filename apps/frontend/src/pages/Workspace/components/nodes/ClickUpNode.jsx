import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "createTask",  label: "Create Task" },
  { value: "updateTask",  label: "Update Task" },
  { value: "deleteTask",  label: "Delete Task" },
  { value: "getTask",     label: "Get Task" },
  { value: "listTasks",   label: "List Tasks" },
  { value: "addComment",  label: "Add Comment" },
  { value: "createFolder",label: "Create Folder" },
];

const PRIORITIES = [
  { value: 1, label: "Urgent" },
  { value: 2, label: "High" },
  { value: 3, label: "Normal" },
  { value: 4, label: "Low" },
];

export default function ClickUpNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "createTask";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#7B68EE]/10 border border-[#7B68EE]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#7B68EE">
            <path d="M2.085 16.086l2.528-1.92c1.648 2.166 3.28 3.226 5.023 3.226 1.73 0 3.336-1.048 4.947-3.2l2.557 1.88C14.773 18.96 12.382 20.5 9.636 20.5c-2.762 0-5.17-1.55-7.551-4.414zM9.635 3.5L3.5 9.06l1.874 2.068 4.26-3.86 4.24 3.86L15.749 9z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">ClickUp</div>
          <div className="text-[11px] text-zinc-500">Tasks, lists, folders, comments</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#7B68EE]/10 border-[#7B68EE]/40 text-[#7B68EE]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["createTask","listTasks"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">List ID</label>
          <SmartVariableInput value={config.listId || ""} onChange={(v) => updateConfig("listId", v)} placeholder="ClickUp list ID" />
        </div>
      )}

      {["updateTask","deleteTask","getTask","addComment"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Task ID</label>
          <SmartVariableInput value={config.taskId || ""} onChange={(v) => updateConfig("taskId", v)} placeholder="{{ $json.id }}" />
        </div>
      )}

      {(op === "createTask" || op === "updateTask") && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Task Name</label>
            <SmartVariableInput value={config.name || ""} onChange={(v) => updateConfig("name", v)} placeholder="Review {{ $json.client }} contract" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Description</label>
            <SmartVariableInput value={config.description || ""} onChange={(v) => updateConfig("description", v)} placeholder="Task details..." multiline />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Priority</label>
            <div className="flex gap-1.5">
              {PRIORITIES.map((p) => (
                <button key={p.value} onClick={() => updateConfig("priority", p.value)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${config.priority === p.value ? "bg-[#7B68EE]/10 border-[#7B68EE]/40 text-[#7B68EE]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Due Date (timestamp or ISO)</label>
            <SmartVariableInput value={config.dueDate || ""} onChange={(v) => updateConfig("dueDate", v)} placeholder="{{ $json.deadline }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Assignees (user IDs, comma-sep)</label>
            <SmartVariableInput value={config.assignees || ""} onChange={(v) => updateConfig("assignees", v)} placeholder="123,456" />
          </div>
        </>
      )}

      {op === "addComment" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Comment</label>
          <SmartVariableInput value={config.comment || ""} onChange={(v) => updateConfig("comment", v)} placeholder="{{ $json.note }}" multiline />
        </div>
      )}

      {op === "createFolder" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Space ID</label>
            <SmartVariableInput value={config.spaceId || ""} onChange={(v) => updateConfig("spaceId", v)} placeholder="ClickUp space ID" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Folder Name</label>
            <SmartVariableInput value={config.name || ""} onChange={(v) => updateConfig("name", v)} placeholder="Q3 Projects" />
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="ClickUp API Token" placeholder="Select ClickUp credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, name, url, status, priority</span>
      </div>
    </div>
  );
}
