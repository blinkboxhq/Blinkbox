import CredentialPicker from '../../../../components/ui/CredentialPicker';

export default function YouTubeTriggerNode({ config = {}, updateConfig }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-red-400">YouTube Trigger</span>
          <span className="text-[10px] text-zinc-500">Fires when a new video is published on a channel</span>
        </div>
      </div>

      <CredentialPicker
        label="Google OAuth"
        value={config.credentialId || ''}
        onChange={(v) => updateConfig('credentialId', v)}
        oauthProvider="google"
        accentColor="red"
        placeholder="Select Google credential…"
        hint="Needs YouTube Data API v3 — connect via Google OAuth."
      />

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Channel ID</label>
        <input
          value={config.channelId || ""}
          onChange={(e) => updateConfig("channelId", e.target.value)}
          placeholder="UCxxxxxxxxxxxxxxxxxxxxxx"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-red-500/40"
        />
        <p className="text-[9px] text-zinc-600">Find it in the channel URL: youtube.com/channel/UCxxx</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Poll Interval (min)</label>
          <input
            type="number" min="5" max="1440"
            value={config.pollIntervalMinutes ?? 15}
            onChange={(e) => updateConfig("pollIntervalMinutes", parseInt(e.target.value))}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-red-500/40"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Max Results</label>
          <input
            type="number" min="1" max="10"
            value={config.maxResults ?? 5}
            onChange={(e) => updateConfig("maxResults", parseInt(e.target.value))}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-red-500/40"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 p-3 bg-zinc-900 rounded-lg border border-zinc-800">
        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-0.5">Available in workflow as</span>
        {[
          ['$trigger.videoId', 'YouTube video ID'],
          ['$trigger.title', 'Video title'],
          ['$trigger.description', 'Video description'],
          ['$trigger.publishedAt', 'Publish date (ISO)'],
          ['$trigger.channelTitle', 'Channel name'],
          ['$trigger.thumbnailUrl', 'Thumbnail image URL'],
          ['$trigger.url', 'Full YouTube watch URL'],
        ].map(([key, desc]) => (
          <div key={key} className="flex items-baseline gap-2">
            <span className="text-[10px] font-mono text-red-400 shrink-0">{key}</span>
            <span className="text-[9px] text-zinc-600">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
