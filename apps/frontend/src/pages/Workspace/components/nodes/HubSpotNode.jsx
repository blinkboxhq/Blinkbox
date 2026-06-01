import { Users } from "lucide-react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "createContact",  label: "Create Contact" },
  { value: "getContact",     label: "Get Contact" },
  { value: "updateContact",  label: "Update Contact" },
  { value: "searchContacts", label: "Search Contacts" },
  { value: "createDeal",     label: "Create Deal" },
  { value: "getDeal",        label: "Get Deal" },
  { value: "updateDeal",     label: "Update Deal" },
  { value: "createNote",     label: "Create Note" },
  { value: "listOwners",     label: "List Owners" },
];

const DEAL_STAGES = ["appointmentscheduled", "qualifiedtobuy", "presentationscheduled", "decisionmakerboughtin", "contractsent", "closedwon", "closedlost"];

export default function HubSpotNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "createContact";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#FF7A59]/5 border border-[#FF7A59]/20 rounded-xl">
        <div className="p-2 bg-[#FF7A59]/10 rounded-lg border border-[#FF7A59]/20 shrink-0 flex items-center justify-center">
          <Users className="w-5 h-5 text-[#FF7A59]" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#FF7A59]">HubSpot</span>
          <span className="text-[10px] text-zinc-500">CRM contacts, deals, and notes</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-1.5">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-2 rounded-lg border text-xs font-bold transition-all ${op === o.value ? "bg-[#FF7A59]/10 border-[#FF7A59]/40 text-[#FF7A59]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["createContact", "getContact", "updateContact", "searchContacts"].includes(op) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Email</label>
          <SmartVariableInput nodeId={nodeId} value={config.email || ""} onChange={(v) => updateConfig("email", v)} placeholder="{{n1.email}}" />
        </div>
      )}

      {["updateContact", "getContact"].includes(op) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Contact ID (or use email above)</label>
          <SmartVariableInput nodeId={nodeId} value={config.contactId || ""} onChange={(v) => updateConfig("contactId", v)} placeholder="{{n1.id}}" />
        </div>
      )}

      {["createContact", "updateContact"].includes(op) && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">First Name</label>
              <SmartVariableInput nodeId={nodeId} value={config.firstName || ""} onChange={(v) => updateConfig("firstName", v)} placeholder="{{n1.firstName}}" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Last Name</label>
              <SmartVariableInput nodeId={nodeId} value={config.lastName || ""} onChange={(v) => updateConfig("lastName", v)} placeholder="{{n1.lastName}}" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Company</label>
            <SmartVariableInput nodeId={nodeId} value={config.company || ""} onChange={(v) => updateConfig("company", v)} placeholder="Acme Corp" />
          </div>
        </>
      )}

      {["createDeal", "updateDeal"].includes(op) && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Deal Name</label>
            <SmartVariableInput nodeId={nodeId} value={config.dealName || ""} onChange={(v) => updateConfig("dealName", v)} placeholder="{{n1.company}} - Enterprise" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Amount ($)</label>
              <SmartVariableInput nodeId={nodeId} value={config.amount || ""} onChange={(v) => updateConfig("amount", v)} placeholder="50000" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Close Date (YYYY-MM-DD)</label>
              <SmartVariableInput nodeId={nodeId} value={config.closeDate || ""} onChange={(v) => updateConfig("closeDate", v)} placeholder="2024-12-31" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Stage</label>
            <div className="flex flex-wrap gap-1.5">
              {DEAL_STAGES.map((s) => (
                <button key={s} onClick={() => updateConfig("stage", s)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${config.stage === s ? "bg-[#FF7A59]/10 border-[#FF7A59]/40 text-[#FF7A59]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {op === "getDeal" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Deal ID</label>
          <SmartVariableInput nodeId={nodeId} value={config.dealId || ""} onChange={(v) => updateConfig("dealId", v)} placeholder="{{n1.id}}" />
        </div>
      )}

      {op === "createNote" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Note Body</label>
          <SmartVariableInput nodeId={nodeId} value={config.body || ""} onChange={(v) => updateConfig("body", v)} placeholder="{{n1.callSummary}}" multiline />
        </div>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="orange" label="HubSpot Private App Token (pat-...)" placeholder="Select HubSpot credential..." />
    </div>
  );
}
