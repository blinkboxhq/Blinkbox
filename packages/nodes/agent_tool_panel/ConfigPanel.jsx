import CredentialPicker from "@/components/ui/CredentialPicker";
import SmartVariableInput from "@/components/ui/SmartVariableInput";

export default function makeAgentToolPanel({ label, description = "", fields = [] }) {
  return function AgentToolPanel({ config = {}, updateConfig, nodeId }) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div>
          <p className="text-[13px] font-bold text-zinc-100">{label}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">{description || "AI Agent tool"}</p>
        </div>
        {fields.map(field =>
          field.type === "credential" ? (
            <CredentialPicker key={field.key}
              value={config[field.key] || ""}
              onChange={id => updateConfig(field.key, id)}
              type={field.credentialType}
              label={field.label}
              placeholder={`Select ${field.label}…`}
            />
          ) : field.type === "textarea" ? (
            <div key={field.key}>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">{field.label}</label>
              <SmartVariableInput
                value={config[field.key] || ""}
                onChange={v => updateConfig(field.key, v)}
                placeholder={field.placeholder || ""}
                label={field.label}
                multiline
                nodeId={nodeId}
              />
            </div>
          ) : (
            <div key={field.key}>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">{field.label}</label>
              <SmartVariableInput
                value={config[field.key] || ""}
                onChange={v => updateConfig(field.key, v)}
                placeholder={field.placeholder || ""}
                label={field.label}
                nodeId={nodeId}
              />
            </div>
          )
        )}
        {fields.length === 0 && (
          <p className="text-[11px] text-zinc-600 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
            No configuration required — ready to use.
          </p>
        )}
      </div>
    );
  };
}
