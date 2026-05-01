import CredentialPicker from "../../../../components/ui/CredentialPicker";

export default function makeAgentModelPanel({ label, credentialType, hasBaseUrl = false }) {
  return function AgentModelPanel({ config = {}, updateConfig }) {
    return (
      <div className="flex flex-col gap-4 p-4">

        {/* Header */}
        <div>
          <p className="text-[13px] font-bold text-zinc-100">{label}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Agent chat model — click the node to pick a model</p>
        </div>

        {/* Base URL for local models (Ollama) */}
        {hasBaseUrl && (
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Base URL</label>
            <input
              value={config.baseUrl || "http://localhost:11434"}
              onChange={e => updateConfig("baseUrl", e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
            />
          </div>
        )}

        {/* API Key — only field for cloud providers */}
        {credentialType && (
          <CredentialPicker
            value={config.credentialId || ""}
            onChange={id => updateConfig("credentialId", id)}
            type={credentialType}
            label={`${label} API Key`}
            placeholder={`Select ${label} credential…`}
          />
        )}

      </div>
    );
  };
}
