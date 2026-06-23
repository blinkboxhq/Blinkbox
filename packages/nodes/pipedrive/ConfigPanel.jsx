import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "createDeal",    label: "Create Deal" },
  { value: "updateDeal",    label: "Update Deal" },
  { value: "getDeal",       label: "Get Deal" },
  { value: "listDeals",     label: "List Deals" },
  { value: "createPerson",  label: "Create Person" },
  { value: "updatePerson",  label: "Update Person" },
  { value: "createActivity",label: "Create Activity" },
  { value: "createNote",    label: "Create Note" },
  { value: "searchDeals",   label: "Search Deals" },
];

export default function PipedriveNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "createDeal";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#F55137]/10 border border-[#F55137]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#F55137">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1.5 14.5c-2.485 0-4.5-2.015-4.5-4.5S11.015 7.5 13.5 7.5 18 9.515 18 12s-2.015 4.5-4.5 4.5zM13.5 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Pipedrive</div>
          <div className="text-[11px] text-zinc-500">Deals, contacts, activities, notes</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#F55137]/10 border-[#F55137]/40 text-[#F55137]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["updateDeal","getDeal"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Deal ID</label>
          <SmartVariableInput value={config.dealId || ""} onChange={(v) => updateConfig("dealId", v)} placeholder="{{ $json.id }}" />
        </div>
      )}

      {["updatePerson"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Person ID</label>
          <SmartVariableInput value={config.personId || ""} onChange={(v) => updateConfig("personId", v)} placeholder="{{ $json.id }}" />
        </div>
      )}

      {(op === "createDeal" || op === "updateDeal") && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Deal Title</label>
            <SmartVariableInput value={config.title || ""} onChange={(v) => updateConfig("title", v)} placeholder="{{ $json.company }} - Enterprise Deal" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Value</label>
              <SmartVariableInput value={config.value || ""} onChange={(v) => updateConfig("value", v)} placeholder="5000" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Currency</label>
              <SmartVariableInput value={config.currency || "USD"} onChange={(v) => updateConfig("currency", v)} placeholder="USD" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Expected Close Date (YYYY-MM-DD)</label>
            <SmartVariableInput value={config.closeTime || ""} onChange={(v) => updateConfig("closeTime", v)} placeholder="{{ $json.closeDate }}" />
          </div>
        </>
      )}

      {(op === "createPerson" || op === "updatePerson") && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Name</label>
            <SmartVariableInput value={config.name || ""} onChange={(v) => updateConfig("name", v)} placeholder="{{ $json.name }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Email</label>
            <SmartVariableInput value={config.email || ""} onChange={(v) => updateConfig("email", v)} placeholder="{{ $json.email }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Phone</label>
            <SmartVariableInput value={config.phone || ""} onChange={(v) => updateConfig("phone", v)} placeholder="{{ $json.phone }}" />
          </div>
        </>
      )}

      {op === "createActivity" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Subject</label>
            <SmartVariableInput value={config.subject || ""} onChange={(v) => updateConfig("subject", v)} placeholder="Call with {{ $json.name }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Activity Type</label>
            <div className="flex gap-1.5 flex-wrap">
              {["call","meeting","task","email","lunch"].map((t) => (
                <button key={t} onClick={() => updateConfig("type", t)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${config.type === t ? "bg-[#F55137]/10 border-[#F55137]/40 text-[#F55137]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Due Date</label>
            <SmartVariableInput value={config.dueDate || ""} onChange={(v) => updateConfig("dueDate", v)} placeholder="2024-12-31" />
          </div>
        </>
      )}

      {op === "createNote" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Note Content</label>
            <SmartVariableInput value={config.content || ""} onChange={(v) => updateConfig("content", v)} placeholder="{{ $json.note }}" multiline />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Attach to Deal ID (optional)</label>
            <SmartVariableInput value={config.dealId || ""} onChange={(v) => updateConfig("dealId", v)} placeholder="{{ $json.dealId }}" />
          </div>
        </>
      )}

      {op === "searchDeals" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Search Term</label>
          <SmartVariableInput value={config.term || ""} onChange={(v) => updateConfig("term", v)} placeholder="{{ $json.company }}" />
        </div>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="orange" label="Pipedrive API Token" placeholder="Select Pipedrive credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, title, status, value, close_time</span>
      </div>
    </div>
  );
}
