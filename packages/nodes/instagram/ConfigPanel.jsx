import SmartVariableInput from "@/components/ui/SmartVariableInput";

export default function InstagramNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "getUserMedia";
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#E4405F]/5 border border-[#E4405F]/20 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-[#E4405F]/10 border border-[#E4405F]/20 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-[#E4405F]">IG</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#E4405F]">Instagram</span>
          <span className="text-[10px] text-zinc-500">Read posts, media and user data via Meta Graph API</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Credential ID</label>
        <SmartVariableInput value={config.credentialId || ""} onChange={v => updateConfig("credentialId", v)}
          placeholder="Instagram OAuth credential ID" nodeId={nodeId} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <select value={op} onChange={e => updateConfig("operation", e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4405F]/40">
          <option value="getUserMedia">Get User Media</option>
          <option value="getUserInfo">Get User Info</option>
          <option value="getMedia">Get Single Media</option>
          <option value="createPost">Create Post</option>
          <option value="getComments">Get Comments</option>
        </select>
      </div>

      {(op === "getMedia" || op === "getComments") && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Media ID</label>
          <SmartVariableInput value={config.mediaId || ""} onChange={v => updateConfig("mediaId", v)}
            placeholder="{{upstream.id}}" nodeId={nodeId} />
        </div>
      )}

      {op === "createPost" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">User ID</label>
            <SmartVariableInput value={config.userId || ""} onChange={v => updateConfig("userId", v)}
              placeholder="{{upstream.userId}}" nodeId={nodeId} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Image URL</label>
            <SmartVariableInput value={config.imageUrl || ""} onChange={v => updateConfig("imageUrl", v)}
              placeholder="https://example.com/image.jpg" nodeId={nodeId} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Caption</label>
            <SmartVariableInput value={config.caption || ""} onChange={v => updateConfig("caption", v)}
              placeholder="Post caption..." nodeId={nodeId} />
          </div>
        </>
      )}

      {(op === "getUserMedia" || op === "getComments") && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Limit</label>
          <SmartVariableInput value={config.limit || ""} onChange={v => updateConfig("limit", v)}
            placeholder="20" nodeId={nodeId} />
        </div>
      )}
    </div>
  );
}
