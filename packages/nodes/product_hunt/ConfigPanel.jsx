import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "listPosts",      label: "List Posts" },
  { value: "getPost",        label: "Get Post" },
  { value: "listComments",   label: "List Comments" },
  { value: "getCollections", label: "Get Collections" },
  { value: "getUserPosts",   label: "Get User's Posts" },
  { value: "searchPosts",    label: "Search Posts" },
];

const SORT_OPTIONS = ["votes","created_at","featured_at"];
const CATEGORIES = ["artificial_intelligence","developer_tools","design_tools","productivity","marketing","finance","health_fitness","games"];

export default function ProductHuntNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "listPosts";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#DA552F]/10 border border-[#DA552F]/30 flex items-center justify-center">
          <svg viewBox="0 0 40 40" className="w-4 h-4" fill="#DA552F">
            <path d="M8 6h14c5.5 0 9 3 9 8s-3.5 8-9 8H14v12H8V6zm6 5v6h7c2 0 3.5-1 3.5-3s-1.5-3-3.5-3H14z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Product Hunt</div>
          <div className="text-[11px] text-zinc-500">Posts, comments, votes, collections</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#DA552F]/10 border-[#DA552F]/40 text-[#DA552F]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["getPost","listComments"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Post ID</label>
          <SmartVariableInput value={config.postId || ""} onChange={(v) => updateConfig("postId", v)} placeholder="{{ $json.id }}" />
        </div>
      )}

      {op === "listPosts" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Featured Date (YYYY-MM-DD, optional)</label>
            <SmartVariableInput value={config.featuredDate || ""} onChange={(v) => updateConfig("featuredDate", v)} placeholder="2024-01-15 (today's launches)" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Sort By</label>
            <div className="flex gap-1.5">
              {SORT_OPTIONS.map((s) => (
                <button key={s} onClick={() => updateConfig("order", s)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${(config.order||"votes") === s ? "bg-[#DA552F]/10 border-[#DA552F]/40 text-[#DA552F]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {s === "created_at" ? "newest" : s === "featured_at" ? "featured" : s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Topic (optional)</label>
            <div className="flex gap-1 flex-wrap">
              {CATEGORIES.slice(0, 4).map((c) => (
                <button key={c} onClick={() => updateConfig("topic", c)}
                  className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all ${config.topic === c ? "bg-[#DA552F]/10 border-[#DA552F]/40 text-[#DA552F]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {c.replace(/_/g," ")}
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

      {op === "searchPosts" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Search Query</label>
            <SmartVariableInput value={config.query || ""} onChange={(v) => updateConfig("query", v)} placeholder="{{ $json.searchTerm }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Limit</label>
            <SmartVariableInput value={config.limit || "10"} onChange={(v) => updateConfig("limit", v)} placeholder="10" />
          </div>
        </>
      )}

      {op === "getUserPosts" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Username</label>
          <SmartVariableInput value={config.username || ""} onChange={(v) => updateConfig("username", v)} placeholder="{{ $json.username }}" />
        </div>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Product Hunt API Token (optional)" placeholder="Select Product Hunt credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, name, tagline, votes_count, url, thumbnail</span>
      </div>
    </div>
  );
}
