import CredentialPicker from '../../../../components/ui/CredentialPicker';

export default function GoogleCalendarTriggerNode({ config = {}, updateConfig }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-blue-400">Google Calendar Trigger</span>
          <span className="text-[10px] text-zinc-500">Fires when a calendar event is about to start</span>
        </div>
      </div>

      <CredentialPicker
        label="Google OAuth"
        value={config.credentialId || ''}
        onChange={(v) => updateConfig('credentialId', v)}
        oauthProvider="google"
        accentColor="blue"
        placeholder="Select Google credential…"
        hint="Needs calendar.readonly scope — click Connect with Google to authorize."
      />

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Calendar ID</label>
        <input
          value={config.calendarId || "primary"}
          onChange={(e) => updateConfig("calendarId", e.target.value)}
          placeholder="primary  or  user@example.com"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Fire N Minutes Before Start</label>
        <input
          type="number" min="0" max="1440"
          value={config.minutesBefore ?? 0}
          onChange={(e) => updateConfig("minutesBefore", parseInt(e.target.value))}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500/40"
        />
        <p className="text-[9px] text-zinc-600">0 = fire when event starts, 15 = 15 minutes before</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Title Keyword Filter (optional)</label>
        <input
          value={config.filterQuery || ""}
          onChange={(e) => updateConfig("filterQuery", e.target.value)}
          placeholder="standup  — only fire for events with this in title"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Poll Interval (min)</label>
        <input
          type="number" min="1" max="60"
          value={config.pollIntervalMinutes ?? 1}
          onChange={(e) => updateConfig("pollIntervalMinutes", parseInt(e.target.value))}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500/40"
        />
      </div>
    </div>
  );
}
