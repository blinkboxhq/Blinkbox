import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "postStatus",     label: "Post Toot" },
  { value: "deleteStatus",   label: "Delete Toot" },
  { value: "boostStatus",    label: "Boost (Reblog)" },
  { value: "favouriteStatus",label: "Favourite" },
  { value: "getTimeline",    label: "Get Home Timeline" },
  { value: "searchAccounts", label: "Search Accounts" },
  { value: "followAccount",  label: "Follow Account" },
];

const VISIBILITIES = ["public","unlisted","private","direct"];

export default function MastodonNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "postStatus";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#6364FF]/10 border border-[#6364FF]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#6364FF">
            <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 00.023-.043v-1.809a.052.052 0 00-.02-.041.053.053 0 00-.046-.01 20.282 20.282 0 01-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 01-.319-1.433.053.053 0 01.066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Mastodon</div>
          <div className="text-[11px] text-zinc-500">Toots, boosts, timeline, follows</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Instance URL</label>
        <SmartVariableInput value={config.instanceUrl || ""} onChange={(v) => updateConfig("instanceUrl", v)} placeholder="https://mastodon.social" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#6364FF]/10 border-[#6364FF]/40 text-[#6364FF]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["deleteStatus","boostStatus","favouriteStatus"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Status ID</label>
          <SmartVariableInput value={config.statusId || ""} onChange={(v) => updateConfig("statusId", v)} placeholder="{{ $json.id }}" />
        </div>
      )}

      {op === "postStatus" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Toot Content</label>
            <SmartVariableInput value={config.status || ""} onChange={(v) => updateConfig("status", v)} placeholder="{{ $json.text }} #blinkbox" multiline />
            <p className="text-[10px] text-zinc-600 mt-1">500 char max. Supports #hashtags and @mentions.</p>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Visibility</label>
            <div className="flex gap-1.5">
              {VISIBILITIES.map((v) => (
                <button key={v} onClick={() => updateConfig("visibility", v)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${(config.visibility||"public") === v ? "bg-[#6364FF]/10 border-[#6364FF]/40 text-[#6364FF]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Content Warning / Spoiler (optional)</label>
            <SmartVariableInput value={config.spoilerText || ""} onChange={(v) => updateConfig("spoilerText", v)} placeholder="Long thread warning" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">In Reply To ID (optional)</label>
            <SmartVariableInput value={config.inReplyToId || ""} onChange={(v) => updateConfig("inReplyToId", v)} placeholder="{{ $json.inReplyTo }}" />
          </div>
        </>
      )}

      {op === "searchAccounts" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Query</label>
          <SmartVariableInput value={config.q || ""} onChange={(v) => updateConfig("q", v)} placeholder="username or handle" />
        </div>
      )}

      {op === "followAccount" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Account ID</label>
          <SmartVariableInput value={config.accountId || ""} onChange={(v) => updateConfig("accountId", v)} placeholder="{{ $json.id }}" />
        </div>
      )}

      {op === "getTimeline" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Limit</label>
          <SmartVariableInput value={config.limit || "20"} onChange={(v) => updateConfig("limit", v)} placeholder="20" />
        </div>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="Mastodon Access Token" placeholder="Select Mastodon credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, content, visibility, url, reblogs_count</span>
      </div>
    </div>
  );
}
