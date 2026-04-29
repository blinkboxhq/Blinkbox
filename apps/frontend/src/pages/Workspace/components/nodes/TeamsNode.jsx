import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "sendMessage",     label: "Send Message" },
  { value: "sendCard",        label: "Send Adaptive Card" },
  { value: "replyMessage",    label: "Reply to Thread" },
  { value: "createChannel",   label: "Create Channel" },
  { value: "listChannels",    label: "List Channels" },
  { value: "listTeams",       label: "List Teams" },
  { value: "createMeeting",   label: "Create Meeting" },
];

export default function TeamsNode({ config = {}, updateConfig }) {
  const op = config.operation || "sendMessage";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#6264A7]/10 border border-[#6264A7]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#6264A7">
            <path d="M20.625 5.625h-5.25V3.75A2.625 2.625 0 0012.75 1.125h-1.5a2.625 2.625 0 00-2.625 2.625v1.875H3.375A.375.375 0 003 6v12.375A2.625 2.625 0 005.625 21h12.75A2.625 2.625 0 0021 18.375V6a.375.375 0 00-.375-.375zM10.125 3.75a1.125 1.125 0 011.125-1.125h1.5a1.125 1.125 0 011.125 1.125v1.875h-3.75V3.75zm3.75 9h-3.75v-1.5h3.75v1.5zm0-3h-3.75V8.25h3.75v1.5z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Microsoft Teams</div>
          <div className="text-[11px] text-zinc-500">Messages, channels, meetings</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#6264A7]/10 border-[#6264A7]/40 text-[#6264A7]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["sendMessage","sendCard","replyMessage","createChannel","listChannels"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Team ID</label>
          <SmartVariableInput value={config.teamId || ""} onChange={(v) => updateConfig("teamId", v)} placeholder="{{ $json.teamId }}" />
        </div>
      )}

      {["sendMessage","sendCard","replyMessage"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Channel ID</label>
          <SmartVariableInput value={config.channelId || ""} onChange={(v) => updateConfig("channelId", v)} placeholder="{{ $json.channelId }}" />
        </div>
      )}

      {op === "sendMessage" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Message</label>
          <SmartVariableInput value={config.content || ""} onChange={(v) => updateConfig("content", v)} placeholder="Deployment complete: {{ $json.version }}" multiline />
        </div>
      )}

      {op === "sendCard" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Adaptive Card JSON</label>
          <SmartVariableInput value={config.card || ""} onChange={(v) => updateConfig("card", v)} placeholder='{"type":"AdaptiveCard","body":[{"type":"TextBlock","text":"Hello!"}]}' multiline />
        </div>
      )}

      {op === "replyMessage" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Message ID (thread to reply to)</label>
            <SmartVariableInput value={config.messageId || ""} onChange={(v) => updateConfig("messageId", v)} placeholder="{{ $json.messageId }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Reply Content</label>
            <SmartVariableInput value={config.content || ""} onChange={(v) => updateConfig("content", v)} placeholder="Thanks for the update!" multiline />
          </div>
        </>
      )}

      {op === "createChannel" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Channel Name</label>
            <SmartVariableInput value={config.displayName || ""} onChange={(v) => updateConfig("displayName", v)} placeholder="alerts-production" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Description (optional)</label>
            <SmartVariableInput value={config.description || ""} onChange={(v) => updateConfig("description", v)} placeholder="Production alerts channel" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Membership Type</label>
            <div className="flex gap-1.5">
              {["standard","private"].map((t) => (
                <button key={t} onClick={() => updateConfig("membershipType", t)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(config.membershipType||"standard") === t ? "bg-[#6264A7]/10 border-[#6264A7]/40 text-[#6264A7]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {op === "createMeeting" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Subject</label>
            <SmartVariableInput value={config.subject || ""} onChange={(v) => updateConfig("subject", v)} placeholder="Sprint Review" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Start (ISO)</label>
              <SmartVariableInput value={config.startDateTime || ""} onChange={(v) => updateConfig("startDateTime", v)} placeholder="{{ $json.start }}" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">End (ISO)</label>
              <SmartVariableInput value={config.endDateTime || ""} onChange={(v) => updateConfig("endDateTime", v)} placeholder="{{ $json.end }}" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Attendees (emails, comma-sep)</label>
            <SmartVariableInput value={config.attendees || ""} onChange={(v) => updateConfig("attendees", v)} placeholder="alice@co.com, bob@co.com" />
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="violet" label="Microsoft 365 (OAuth)" placeholder="Select Teams credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, etag, createdDateTime, webUrl</span>
      </div>
    </div>
  );
}
