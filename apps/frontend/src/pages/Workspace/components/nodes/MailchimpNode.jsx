import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "addSubscriber",    label: "Add / Update Subscriber" },
  { value: "removeSubscriber", label: "Unsubscribe" },
  { value: "getSubscriber",    label: "Get Subscriber" },
  { value: "listCampaigns",    label: "List Campaigns" },
  { value: "sendCampaign",     label: "Send Campaign" },
  { value: "createCampaign",   label: "Create Campaign" },
  { value: "addTag",           label: "Add Tag to Subscriber" },
  { value: "listLists",        label: "List Audiences" },
];

export default function MailchimpNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "addSubscriber";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#FFE01B">
            <path d="M21.543 11.507c.004-.04.013-.08.013-.121 0-.51-.234-.967-.6-1.275-.116-2.094-1.27-3.912-2.975-5.044C17.53 4.587 16.87 4 16.048 4c-.434 0-.835.162-1.145.43C13.964 4.16 12.998 4 12 4c-.998 0-1.964.16-2.903.43A1.764 1.764 0 007.952 4c-.822 0-1.482.587-1.933 1.067C4.314 6.199 3.16 8.017 3.044 10.11c-.366.308-.6.765-.6 1.275 0 .041.009.08.013.121a2.76 2.76 0 00-.72 1.838c0 .777.322 1.479.836 1.988.614 2.71 3.292 4.709 6.427 4.709 3.135 0 5.813-2 6.427-4.71a2.763 2.763 0 00.836-1.987 2.76 2.76 0 00-.72-1.837z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Mailchimp</div>
          <div className="text-[11px] text-zinc-500">Subscribers, lists, campaigns, tags</div>
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

      {!["listCampaigns","createCampaign","listLists"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Audience (List) ID</label>
          <SmartVariableInput nodeId={nodeId} value={config.listId || ""} onChange={(v) => updateConfig("listId", v)} placeholder="Mailchimp audience ID" />
        </div>
      )}

      {(op === "addSubscriber" || op === "getSubscriber" || op === "removeSubscriber" || op === "addTag") && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Email Address</label>
          <SmartVariableInput nodeId={nodeId} value={config.email || ""} onChange={(v) => updateConfig("email", v)} placeholder="{{ $json.email }}" />
        </div>
      )}

      {op === "addSubscriber" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">First Name</label>
              <SmartVariableInput nodeId={nodeId} value={config.firstName || ""} onChange={(v) => updateConfig("firstName", v)} placeholder="{{ $json.firstName }}" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Last Name</label>
              <SmartVariableInput nodeId={nodeId} value={config.lastName || ""} onChange={(v) => updateConfig("lastName", v)} placeholder="{{ $json.lastName }}" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Status</label>
            <div className="flex gap-1.5">
              {["subscribed","pending","unsubscribed"].map((s) => (
                <button key={s} onClick={() => updateConfig("status", s)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${(config.status||"subscribed") === s ? "bg-zinc-700/50 border-zinc-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Tags (comma-sep, optional)</label>
            <SmartVariableInput nodeId={nodeId} value={config.tags || ""} onChange={(v) => updateConfig("tags", v)} placeholder="vip,new-user" />
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <p className="text-[12px] font-semibold text-zinc-300">Update if exists</p>
            <button onClick={() => updateConfig("updateExisting", !config.updateExisting)}
              className={`w-10 h-5 rounded-full border transition-all relative ${config.updateExisting !== false ? "bg-zinc-600 border-zinc-500" : "bg-zinc-700 border-zinc-600"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.updateExisting !== false ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        </>
      )}

      {op === "addTag" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Tag Name</label>
          <SmartVariableInput nodeId={nodeId} value={config.tagName || ""} onChange={(v) => updateConfig("tagName", v)} placeholder="premium-user" />
        </div>
      )}

      {op === "sendCampaign" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Campaign ID</label>
          <SmartVariableInput nodeId={nodeId} value={config.campaignId || ""} onChange={(v) => updateConfig("campaignId", v)} placeholder="{{ $json.id }}" />
        </div>
      )}

      {op === "createCampaign" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Campaign Type</label>
            <div className="flex gap-1.5">
              {["regular","plaintext","rss","variate"].map((t) => (
                <button key={t} onClick={() => updateConfig("type", t)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${(config.type||"regular") === t ? "bg-zinc-700/50 border-zinc-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Audience ID</label>
            <SmartVariableInput nodeId={nodeId} value={config.listId || ""} onChange={(v) => updateConfig("listId", v)} placeholder="Mailchimp audience ID" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Subject Line</label>
            <SmartVariableInput nodeId={nodeId} value={config.subjectLine || ""} onChange={(v) => updateConfig("subjectLine", v)} placeholder="Your {{ $json.month }} newsletter is here!" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">From Name</label>
            <SmartVariableInput nodeId={nodeId} value={config.fromName || ""} onChange={(v) => updateConfig("fromName", v)} placeholder="My Company" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Reply-To Email</label>
            <SmartVariableInput nodeId={nodeId} value={config.replyTo || ""} onChange={(v) => updateConfig("replyTo", v)} placeholder="hello@mycompany.com" />
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Mailchimp API Key" placeholder="Select Mailchimp credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, email_address, status, list_id, timestamp_signup</span>
      </div>
    </div>
  );
}
