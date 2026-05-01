import CredentialPicker from "../../../../components/ui/CredentialPicker";

export default function makeAgentMemoryPanel({ label, credentialType, hasConnectionString = false, connectionStringPlaceholder = "connection string" }) {
  return function AgentMemoryPanel({ config = {}, updateConfig }) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div>
          <p className="text-[13px] font-bold text-zinc-100">{label}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Agent memory provider</p>
        </div>

        {hasConnectionString && (
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Connection String</label>
            <input
              value={config.connectionString || ""}
              onChange={e => updateConfig("connectionString", e.target.value)}
              placeholder={connectionStringPlaceholder}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
            />
          </div>
        )}

        {credentialType && (
          <CredentialPicker
            value={config.credentialId || ""}
            onChange={id => updateConfig("credentialId", id)}
            type={credentialType}
            label={`${label} Credential`}
            placeholder={`Select ${label} credential…`}
          />
        )}
      </div>
    );
  };
}
