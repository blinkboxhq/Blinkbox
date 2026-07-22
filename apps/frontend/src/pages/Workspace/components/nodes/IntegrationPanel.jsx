import { Plug } from "lucide-react";
import CredentialPicker from "@/components/ui/CredentialPicker";
import { ConfigSection, ConfigHeader, ConfigBadge, ConfigInput } from "@/components/ui/ConfigKit";
import AgentActionPicker from "../AgentActionPicker";
import AgentResourcePicker from "../AgentResourcePicker";
import useIntegrationActions from "@/hooks/useIntegrationActions";
import { NodeRegistry } from "../../nodeRegistry";

// --bb-accent from index.css :root
const ACCENT = "#6f97e8";

export default function IntegrationPanel({ type, config = {}, updateConfig, nodeId }) {
  const def = NodeRegistry[type] || NodeRegistry[`agent_integration_${type}`] || {};
  const label = def.label || type;
  const connected = !!config.credentialId;
  const { resources } = useIntegrationActions(type);
  const pinned = config.resources && typeof config.resources === "object" ? config.resources : {};

  const setResource = (kind, list) => updateConfig("resources", { ...pinned, [kind]: list });

  return (
    <ConfigSection>
      <ConfigHeader
        logoUrl={def.logoUrl}
        imgFilter={def.imgFilter}
        icon={def.icon || Plug}
        iconColor={ACCENT}
        title={label}
        subtitle="Agent integration"
        badge={
          connected
            ? <ConfigBadge tone="live" label="CONNECTED" />
            : <ConfigBadge label="NO ACCOUNT" accentColor="#fbbf24" />
        }
      />

      <CredentialPicker
        label={`${label} Account`}
        value={config.credentialId || ""}
        onChange={(v) => updateConfig("credentialId", v)}
        credentialType={label}
        accentColor="blue"
        placeholder={`Select ${label} credential…`}
      />

      <ConfigInput
        label="Alias"
        value={config.alias || ""}
        onChange={(v) => updateConfig("alias", v)}
        placeholder={`e.g. Work ${label}`}
      />

      <AgentActionPicker
        type={type}
        value={config.enabledActions}
        onChange={(v) => updateConfig("enabledActions", v)}
        accentColor={ACCENT}
      />

      {resources.map((r) => (
        <AgentResourcePicker
          key={r.kind}
          type={type}
          kind={r.kind}
          label={r.label}
          credentialId={config.credentialId}
          value={pinned[r.kind]}
          onChange={(v) => setResource(r.kind, v)}
          accentColor={ACCENT}
        />
      ))}
    </ConfigSection>
  );
}
