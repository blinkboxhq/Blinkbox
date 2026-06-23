export default function RedditTriggerNode({ config = {}, updateConfig }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-orange-400">Reddit Trigger</span>
          <span className="text-[10px] text-zinc-500">Fires on new posts in a subreddit (no API key needed)</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Subreddit</label>
        <input
          value={config.subreddit || ""}
          onChange={(e) => updateConfig("subreddit", e.target.value.replace(/^r\//i, ""))}
          placeholder="programming  (without r/)"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Keyword Filter (optional)</label>
        <input
          value={config.searchQuery || ""}
          onChange={(e) => updateConfig("searchQuery", e.target.value)}
          placeholder="AI  — only fire if post title contains this"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500/40"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sort</label>
          <div className="grid grid-cols-2 gap-1">
            {["new", "hot"].map((s) => (
              <button
                key={s}
                onClick={() => updateConfig("sort", s)}
                className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                  (config.sort || "new") === s
                    ? "bg-orange-500/10 border-orange-500/40 text-orange-400"
                    : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
                }`}
              >
                {s === "new" ? "New" : "Hot"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Min Score</label>
          <input
            type="number" min="0"
            value={config.minScore || ""}
            onChange={(e) => updateConfig("minScore", e.target.value ? parseInt(e.target.value) : "")}
            placeholder="0  (any)"
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500/40"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Poll Interval (min)</label>
        <input
          type="number" min="5" max="1440"
          value={config.pollIntervalMinutes ?? 10}
          onChange={(e) => updateConfig("pollIntervalMinutes", parseInt(e.target.value))}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500/40"
        />
      </div>

      <div className="flex flex-col gap-1 p-3 bg-zinc-900 rounded-lg border border-zinc-800">
        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-0.5">Available in workflow as</span>
        {[
          ['$trigger.id', 'Reddit post ID'],
          ['$trigger.title', 'Post title'],
          ['$trigger.selftext', 'Post body text'],
          ['$trigger.url', 'Post URL'],
          ['$trigger.author', 'Reddit username'],
          ['$trigger.subreddit', 'Subreddit name'],
          ['$trigger.score', 'Upvote score'],
          ['$trigger.numComments', 'Number of comments'],
          ['$trigger.created', 'Post date (ISO)'],
          ['$trigger.permalink', 'Full reddit.com link'],
          ['$trigger.flair', 'Post flair text'],
        ].map(([key, desc]) => (
          <div key={key} className="flex items-baseline gap-2">
            <span className="text-[10px] font-mono text-orange-400 shrink-0">{key}</span>
            <span className="text-[9px] text-zinc-600">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
