import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "postTweet",    label: "Post Tweet" },
  { value: "replyTweet",   label: "Reply to Tweet" },
  { value: "deleteTweet",  label: "Delete Tweet" },
  { value: "searchTweets", label: "Search Tweets" },
  { value: "getUserTweets", label: "Get User's Tweets" },
  { value: "getUser",      label: "Get User Profile" },
  { value: "likeTweet",    label: "Like Tweet" },
];

export default function TwitterNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "postTweet";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#1DA1F2]/5 border border-[#1DA1F2]/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#1DA1F2]/10 border border-[#1DA1F2]/20 flex items-center justify-center shrink-0">
            <Twitter className="w-4 h-4 text-[#1DA1F2]" />
          </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#1DA1F2]">Twitter / X</span>
          <span className="text-[10px] text-zinc-500">Post, search, and read tweets</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-1.5">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-2 rounded-lg border text-xs font-bold transition-all ${op === o.value ? "bg-[#1DA1F2]/10 border-[#1DA1F2]/40 text-[#1DA1F2]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["postTweet", "replyTweet"].includes(op) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tweet Text (max 280 chars)</label>
          <SmartVariableInput value={config.text || ""} onChange={(v) => updateConfig("text", v)} placeholder="{{n1.summary}}" multiline />
        </div>
      )}

      {op === "replyTweet" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Reply to Tweet ID</label>
          <SmartVariableInput value={config.replyToId || ""} onChange={(v) => updateConfig("replyToId", v)} placeholder="{{n1.tweetId}}" />
        </div>
      )}

      {op === "deleteTweet" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tweet ID</label>
          <SmartVariableInput value={config.tweetId || ""} onChange={(v) => updateConfig("tweetId", v)} placeholder="{{n1.id}}" />
        </div>
      )}

      {op === "searchTweets" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Search Query</label>
            <SmartVariableInput value={config.query || ""} onChange={(v) => updateConfig("query", v)} placeholder="#blinkbox -is:retweet lang:en" />
            <p className="text-[10px] text-zinc-600">Twitter search operators supported</p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Max Results (10–100)</label>
            <input type="number" min="10" max="100" value={config.limit || 10} onChange={(e) => updateConfig("limit", Number(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#1DA1F2]/40" />
          </div>
        </>
      )}

      {op === "getUserTweets" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">User ID</label>
          <SmartVariableInput value={config.userId || ""} onChange={(v) => updateConfig("userId", v)} placeholder="{{n1.id}}" />
        </div>
      )}

      {op === "getUser" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Username</label>
          <SmartVariableInput value={config.username || ""} onChange={(v) => updateConfig("username", v)} placeholder="blinkbox_app" />
        </div>
      )}

      {op === "likeTweet" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Your User ID</label>
            <SmartVariableInput value={config.userId || ""} onChange={(v) => updateConfig("userId", v)} placeholder="123456789" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tweet ID to Like</label>
            <SmartVariableInput value={config.tweetId || ""} onChange={(v) => updateConfig("tweetId", v)} placeholder="{{n1.id}}" />
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Twitter Bearer Token (or OAuth2 for write)" placeholder="Select Twitter credential..." />
      <p className="text-[10px] text-zinc-600 -mt-3">Read-only: Bearer token. Post/like/delete: OAuth2 user context token.</p>
    </div>
  );
}
