import SmartVariableInput from "@/components/ui/SmartVariableInput";

export default function TikTokNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "listVideos";
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#010101]/20 border border-zinc-700 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-zinc-300">TT</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-zinc-200">TikTok</span>
          <span className="text-[10px] text-zinc-500">Read videos and user data via TikTok v2 API</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Credential ID</label>
        <SmartVariableInput value={config.credentialId || ""} onChange={v => updateConfig("credentialId", v)}
          placeholder="TikTok OAuth credential ID" nodeId={nodeId} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <select value={op} onChange={e => updateConfig("operation", e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-600">
          <option value="listVideos">List Videos</option>
          <option value="getUserInfo">Get User Info</option>
          <option value="getVideo">Get Video</option>
          <option value="searchVideos">Search Videos</option>
        </select>
      </div>

      {op === "getVideo" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Video ID</label>
          <SmartVariableInput value={config.videoId || ""} onChange={v => updateConfig("videoId", v)}
            placeholder="{{upstream.id}}" nodeId={nodeId} />
        </div>
      )}

      {op === "searchVideos" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Query</label>
          <SmartVariableInput value={config.query || ""} onChange={v => updateConfig("query", v)}
            placeholder="search term..." nodeId={nodeId} />
        </div>
      )}

      {(op === "listVideos" || op === "searchVideos") && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Limit</label>
          <SmartVariableInput value={config.limit || ""} onChange={v => updateConfig("limit", v)}
            placeholder="20" nodeId={nodeId} />
        </div>
      )}
    </div>
  );
}
