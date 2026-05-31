import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

const OPERATIONS = [
  { value: "getTopStories",  label: "Top Stories" },
  { value: "getNewStories",  label: "New Stories" },
  { value: "getBestStories", label: "Best Stories" },
  { value: "getAskStories",  label: "Ask HN" },
  { value: "getShowStories", label: "Show HN" },
  { value: "getJobStories",  label: "Jobs" },
  { value: "getItem",        label: "Get Item by ID" },
  { value: "getUserInfo",    label: "Get User Info" },
  { value: "searchStories",  label: "Search (Algolia)" },
];

export default function HackerNewsNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "getTopStories";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#FF6600]/10 border border-[#FF6600]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#FF6600">
            <path d="M0 24V0h24v24H0zM6.951 5.896l4.112 7.708v5.064h1.583v-4.972l4.148-7.799h-1.749l-2.457 4.875c-.372.745-.688 1.434-.688 1.434s-.297-.708-.651-1.434L8.831 5.896H6.95z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Hacker News</div>
          <div className="text-[11px] text-zinc-500">Top stories, comments, jobs, search</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#FF6600]/10 border-[#FF6600]/40 text-[#FF6600]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["getTopStories","getNewStories","getBestStories","getAskStories","getShowStories","getJobStories"].includes(op) && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Limit</label>
            <div className="flex gap-1.5">
              {[5,10,25,50].map((l) => (
                <button key={l} onClick={() => updateConfig("limit", l)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(config.limit||10) === l ? "bg-[#FF6600]/10 border-[#FF6600]/40 text-[#FF6600]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <div>
              <p className="text-[12px] font-semibold text-zinc-300">Fetch full details</p>
              <p className="text-[10px] text-zinc-600">Makes N+1 requests for titles/scores</p>
            </div>
            <button onClick={() => updateConfig("fetchDetails", !config.fetchDetails)}
              className={`w-10 h-5 rounded-full border transition-all relative ${config.fetchDetails ? "bg-[#FF6600] border-orange-400" : "bg-zinc-700 border-zinc-600"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.fetchDetails ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        </>
      )}

      {op === "getItem" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Item ID</label>
            <SmartVariableInput value={config.itemId || ""} onChange={(v) => updateConfig("itemId", v)} placeholder="{{ $json.id }}" />
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <p className="text-[12px] font-semibold text-zinc-300">Include comments</p>
            <button onClick={() => updateConfig("includeComments", !config.includeComments)}
              className={`w-10 h-5 rounded-full border transition-all relative ${config.includeComments ? "bg-[#FF6600] border-orange-400" : "bg-zinc-700 border-zinc-600"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.includeComments ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        </>
      )}

      {op === "getUserInfo" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Username</label>
          <SmartVariableInput value={config.username || ""} onChange={(v) => updateConfig("username", v)} placeholder="pg" />
        </div>
      )}

      {op === "searchStories" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Search Query</label>
            <SmartVariableInput value={config.query || ""} onChange={(v) => updateConfig("query", v)} placeholder="{{ $json.searchTerm }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Search By</label>
            <div className="flex gap-1.5">
              {["date","popularity"].map((s) => (
                <button key={s} onClick={() => updateConfig("searchBy", s)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(config.searchBy||"date") === s ? "bg-[#FF6600]/10 border-[#FF6600]/40 text-[#FF6600]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Limit</label>
            <SmartVariableInput value={config.limit || "10"} onChange={(v) => updateConfig("limit", v)} placeholder="10" />
          </div>
        </>
      )}

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        No auth required. Returns: <span className="text-zinc-300">id, title, score, url, by, time, descendants</span>
      </div>
    </div>
  );
}
