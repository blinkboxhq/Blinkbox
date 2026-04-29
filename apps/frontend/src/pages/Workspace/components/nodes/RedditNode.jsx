import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "getHotPosts",    label: "Get Hot Posts" },
  { value: "getNewPosts",    label: "Get New Posts" },
  { value: "getTopPosts",    label: "Get Top Posts" },
  { value: "submitPost",     label: "Submit Post" },
  { value: "submitComment",  label: "Submit Comment" },
  { value: "searchPosts",    label: "Search Posts" },
  { value: "getUserInfo",    label: "Get User Info" },
  { value: "getSubredditInfo", label: "Get Subreddit Info" },
];

const TIME_FILTERS = ["hour","day","week","month","year","all"];

export default function RedditNode({ config = {}, updateConfig }) {
  const op = config.operation || "getHotPosts";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#FF4500]/10 border border-[#FF4500]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#FF4500">
            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Reddit</div>
          <div className="text-[11px] text-zinc-500">Posts, comments, subreddits, search</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#FF4500]/10 border-[#FF4500]/40 text-[#FF4500]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["getHotPosts","getNewPosts","getTopPosts","submitPost","submitComment","getSubredditInfo"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Subreddit</label>
          <SmartVariableInput value={config.subreddit || ""} onChange={(v) => updateConfig("subreddit", v)} placeholder="programming (without r/)" />
        </div>
      )}

      {op === "getTopPosts" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Time Filter</label>
          <div className="flex gap-1.5">
            {TIME_FILTERS.map((t) => (
              <button key={t} onClick={() => updateConfig("t", t)}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${(config.t||"day") === t ? "bg-[#FF4500]/10 border-[#FF4500]/40 text-[#FF4500]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {["getHotPosts","getNewPosts","getTopPosts"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Limit</label>
          <div className="flex gap-1.5">
            {[5,10,25,50].map((l) => (
              <button key={l} onClick={() => updateConfig("limit", l)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(config.limit||10) === l ? "bg-[#FF4500]/10 border-[#FF4500]/40 text-[#FF4500]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {op === "submitPost" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Post Type</label>
            <div className="flex gap-1.5">
              {["link","self"].map((t) => (
                <button key={t} onClick={() => updateConfig("kind", t)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(config.kind||"link") === t ? "bg-[#FF4500]/10 border-[#FF4500]/40 text-[#FF4500]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {t === "link" ? "Link Post" : "Text Post"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Title</label>
            <SmartVariableInput value={config.title || ""} onChange={(v) => updateConfig("title", v)} placeholder="{{ $json.title }}" />
          </div>
          {config.kind === "self" ? (
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Text Content</label>
              <SmartVariableInput value={config.text || ""} onChange={(v) => updateConfig("text", v)} placeholder="{{ $json.body }}" multiline />
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">URL</label>
              <SmartVariableInput value={config.url || ""} onChange={(v) => updateConfig("url", v)} placeholder="{{ $json.url }}" />
            </div>
          )}
        </>
      )}

      {op === "submitComment" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Parent ID (post or comment fullname)</label>
            <SmartVariableInput value={config.parentId || ""} onChange={(v) => updateConfig("parentId", v)} placeholder="t3_xxxx (post) or t1_xxxx (comment)" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Comment Text (Markdown)</label>
            <SmartVariableInput value={config.text || ""} onChange={(v) => updateConfig("text", v)} placeholder="{{ $json.reply }}" multiline />
          </div>
        </>
      )}

      {op === "searchPosts" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Query</label>
            <SmartVariableInput value={config.q || ""} onChange={(v) => updateConfig("q", v)} placeholder="{{ $json.searchTerm }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Subreddit (optional, blank = all)</label>
            <SmartVariableInput value={config.subreddit || ""} onChange={(v) => updateConfig("subreddit", v)} placeholder="programming" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Limit</label>
            <SmartVariableInput value={config.limit || "10"} onChange={(v) => updateConfig("limit", v)} placeholder="10" />
          </div>
        </>
      )}

      {op === "getUserInfo" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Username</label>
          <SmartVariableInput value={config.username || ""} onChange={(v) => updateConfig("username", v)} placeholder="{{ $json.username }}" />
        </div>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="orange" label="Reddit OAuth (Script App)" placeholder="Select Reddit credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, title, score, url, author, subreddit, created_utc</span>
      </div>
    </div>
  );
}
