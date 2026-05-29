import SmartVariableInput from "@/components/ui/SmartVariableInput";

export default function LinkedInNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "getProfile";
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#0A66C2]/5 border border-[#0A66C2]/20 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/10 border border-[#0A66C2]/20 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-[#0A66C2]">in</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#0A66C2]">LinkedIn</span>
          <span className="text-[10px] text-zinc-500">Post updates, get profile and company data</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Credential ID</label>
        <SmartVariableInput value={config.credentialId || ""} onChange={v => updateConfig("credentialId", v)}
          placeholder="LinkedIn OAuth credential ID" nodeId={nodeId} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <select value={op} onChange={e => updateConfig("operation", e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#0A66C2]/40">
          <option value="getProfile">Get My Profile</option>
          <option value="sharePost">Share Post</option>
          <option value="getCompany">Get Company</option>
          <option value="getConnections">Get Connections</option>
        </select>
      </div>

      {op === "sharePost" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Post Text</label>
            <SmartVariableInput value={config.text || ""} onChange={v => updateConfig("text", v)}
              placeholder="Share your update..." nodeId={nodeId} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Article URL (optional)</label>
            <SmartVariableInput value={config.url || ""} onChange={v => updateConfig("url", v)}
              placeholder="https://example.com/article" nodeId={nodeId} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Visibility</label>
            <select value={config.visibility || "PUBLIC"} onChange={e => updateConfig("visibility", e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none">
              <option value="PUBLIC">Public</option>
              <option value="CONNECTIONS">Connections only</option>
            </select>
          </div>
        </>
      )}

      {op === "getCompany" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Company ID</label>
          <SmartVariableInput value={config.companyId || ""} onChange={v => updateConfig("companyId", v)}
            placeholder="{{upstream.companyId}}" nodeId={nodeId} />
        </div>
      )}

      {op === "getConnections" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Limit</label>
          <SmartVariableInput value={config.limit || ""} onChange={v => updateConfig("limit", v)}
            placeholder="50" nodeId={nodeId} />
        </div>
      )}
    </div>
  );
}
