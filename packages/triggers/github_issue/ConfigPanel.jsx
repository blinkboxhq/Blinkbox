import CredentialPicker from '@/components/ui/CredentialPicker';

export default function GitHubIssueTriggerNode({ config = {}, updateConfig }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-zinc-500/5 border border-zinc-500/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-zinc-200">GitHub Issue / PR Trigger</span>
          <span className="text-[10px] text-zinc-500">Fires when a new issue or pull request is opened</span>
        </div>
      </div>

      <CredentialPicker
        label="GitHub Token"
        value={config.credentialId || ''}
        onChange={(v) => updateConfig('credentialId', v)}
        oauthProvider="github"
        accentColor="zinc"
        placeholder="Select GitHub credential…"
        hint="Needs repo scope to read issues and pull requests."
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Owner</label>
          <input
            value={config.owner || ""}
            onChange={(e) => updateConfig("owner", e.target.value)}
            placeholder="octocat"
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500/40"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Repository</label>
          <input
            value={config.repo || ""}
            onChange={(e) => updateConfig("repo", e.target.value)}
            placeholder="my-repo"
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500/40"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Watch For</label>
        <div className="grid grid-cols-3 gap-2">
          {[{ id: "both", label: "Both" }, { id: "issues", label: "Issues" }, { id: "pulls", label: "PRs" }].map((t) => (
            <button
              key={t.id}
              onClick={() => updateConfig("type", t.id)}
              className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                (config.type || "both") === t.id
                  ? "bg-zinc-500/10 border-zinc-400/40 text-zinc-200"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Label Filter (optional)</label>
        <input
          value={config.labelFilter || ""}
          onChange={(e) => updateConfig("labelFilter", e.target.value)}
          placeholder="bug  — only fire for this label"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Poll Interval (min)</label>
        <input
          type="number" min="1" max="1440"
          value={config.pollIntervalMinutes ?? 5}
          onChange={(e) => updateConfig("pollIntervalMinutes", parseInt(e.target.value))}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500/40"
        />
      </div>
    </div>
  );
}
