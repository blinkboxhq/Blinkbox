import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "sendEmail",       label: "Send Email" },
  { value: "replyEmail",      label: "Reply to Email" },
  { value: "getEmail",        label: "Get Email" },
  { value: "listEmails",      label: "List Emails" },
  { value: "createEvent",     label: "Create Calendar Event" },
  { value: "getCalendar",     label: "List Calendar Events" },
  { value: "createContact",   label: "Create Contact" },
  { value: "moveEmail",       label: "Move to Folder" },
  { value: "flagEmail",       label: "Flag / Unflag" },
];

export default function OutlookNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "sendEmail";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#0078D4]/10 border border-[#0078D4]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#0078D4">
            <path d="M24 7.387v10.478c0 .904-.732 1.636-1.636 1.636H13.09V7.387h10.274A.636.636 0 0 1 24 8.023v-.636zM12 4.5L0 6.955v10.09L12 19.5V4.5zm-6.545 9.818c-.893 0-1.619-.27-2.178-.81-.559-.54-.838-1.254-.838-2.142 0-.922.288-1.668.864-2.238.576-.57 1.33-.855 2.262-.855.883 0 1.59.272 2.124.816.533.544.8 1.26.8 2.148 0 .926-.277 1.68-.83 2.262-.554.582-1.29.873-2.204.873v-.054z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Outlook</div>
          <div className="text-[11px] text-zinc-500">Email, calendar, contacts via Microsoft 365</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#0078D4]/10 border-[#0078D4]/40 text-[#0078D4]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {(op === "sendEmail" || op === "replyEmail") && (
        <>
          {op === "replyEmail" && (
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Message ID</label>
              <SmartVariableInput value={config.messageId || ""} onChange={(v) => updateConfig("messageId", v)} placeholder="{{ $json.id }}" />
            </div>
          )}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">To</label>
            <SmartVariableInput value={config.to || ""} onChange={(v) => updateConfig("to", v)} placeholder="{{ $json.email }}" />
          </div>
          {op === "sendEmail" && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">CC (optional)</label>
                <SmartVariableInput value={config.cc || ""} onChange={(v) => updateConfig("cc", v)} placeholder="manager@company.com" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Subject</label>
                <SmartVariableInput value={config.subject || ""} onChange={(v) => updateConfig("subject", v)} placeholder="Weekly report — {{ $json.week }}" />
              </div>
            </>
          )}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Body</label>
            <SmartVariableInput value={config.body || ""} onChange={(v) => updateConfig("body", v)} placeholder="Hi {{ $json.name }},\n\nHere is your report..." multiline />
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <p className="text-[12px] font-semibold text-zinc-300">Send as HTML</p>
            <button onClick={() => updateConfig("isHtml", !config.isHtml)}
              className={`w-10 h-5 rounded-full border transition-all relative ${config.isHtml ? "bg-[#0078D4] border-blue-400" : "bg-zinc-700 border-zinc-600"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.isHtml ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        </>
      )}

      {op === "createEvent" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Subject</label>
            <SmartVariableInput value={config.subject || ""} onChange={(v) => updateConfig("subject", v)} placeholder="Team sync — {{ $json.team }}" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Start (ISO)</label>
              <SmartVariableInput value={config.start || ""} onChange={(v) => updateConfig("start", v)} placeholder="{{ $json.startTime }}" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">End (ISO)</label>
              <SmartVariableInput value={config.end || ""} onChange={(v) => updateConfig("end", v)} placeholder="{{ $json.endTime }}" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Attendees (emails, comma-sep)</label>
            <SmartVariableInput value={config.attendees || ""} onChange={(v) => updateConfig("attendees", v)} placeholder="alice@co.com, bob@co.com" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Location / Teams link (optional)</label>
            <SmartVariableInput value={config.location || ""} onChange={(v) => updateConfig("location", v)} placeholder="Conference Room B" />
          </div>
        </>
      )}

      {op === "createContact" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">First Name</label>
            <SmartVariableInput value={config.firstName || ""} onChange={(v) => updateConfig("firstName", v)} placeholder="{{ $json.firstName }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Last Name</label>
            <SmartVariableInput value={config.lastName || ""} onChange={(v) => updateConfig("lastName", v)} placeholder="{{ $json.lastName }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Email</label>
            <SmartVariableInput value={config.email || ""} onChange={(v) => updateConfig("email", v)} placeholder="{{ $json.email }}" />
          </div>
        </>
      )}

      {op === "getCalendar" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Start Date</label>
            <SmartVariableInput value={config.startDate || ""} onChange={(v) => updateConfig("startDate", v)} placeholder="2024-01-01" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">End Date</label>
            <SmartVariableInput value={config.endDate || ""} onChange={(v) => updateConfig("endDate", v)} placeholder="2024-01-31" />
          </div>
        </div>
      )}

      {op === "moveEmail" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Message ID</label>
            <SmartVariableInput value={config.messageId || ""} onChange={(v) => updateConfig("messageId", v)} placeholder="{{ $json.id }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Destination Folder</label>
            <SmartVariableInput value={config.destinationId || ""} onChange={(v) => updateConfig("destinationId", v)} placeholder="Archive or folder ID" />
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Microsoft 365 (OAuth)" placeholder="Select Outlook credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, subject, from, receivedDateTime, bodyPreview</span>
      </div>
    </div>
  );
}
