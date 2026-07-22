import { Plug } from "lucide-react";
import CredentialPicker from "@/components/ui/CredentialPicker";
import { ConfigSection, ConfigHeader, ConfigBadge, ConfigInput, ConfigBanner } from "@/components/ui/ConfigKit";
import AgentActionPicker from "../AgentActionPicker";
import { NodeRegistry } from "../../nodeRegistry";

// --bb-accent from index.css :root
const ACCENT = "#6f97e8";

const OAUTH_BY_APP = {
  gmail: "google", google_sheets: "google", google_calendar: "google", google_drive: "google",
  google_docs: "google", google_forms: "google", youtube: "google",
  outlook: "microsoft", teams: "microsoft", onedrive: "microsoft", sharepoint: "microsoft",
  instagram: "meta", whatsapp: "meta", facebook: "meta",
  slack: "slack", github: "github", notion: "notion", airtable: "airtable",
};

export default function IntegrationPanel({ type, config = {}, updateConfig, nodeId }) {
  const def = NodeRegistry[type] || NodeRegistry[`agent_integration_${type}`] || {};
  const label = def.label || type;
  const oauth = OAUTH_BY_APP[type] || null;
  const connected = !!config.credentialId;

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

      <ConfigBanner>
        The agent calls {label} on its own — there are no step fields here. Connect an account,
        then tick the actions it is allowed to run.
      </ConfigBanner>

      <CredentialPicker
        label={`${label} Account`}
        value={config.credentialId || ""}
        onChange={(v) => updateConfig("credentialId", v)}
        credentialType={label}
        oauthProvider={oauth}
        accentColor="blue"
        placeholder={`Select ${label} credential…`}
        hint={oauth ? `Connect via OAuth or pick a saved ${label} credential.` : `Add your ${label} API key to the vault, then pick it here.`}
      />

      <ConfigInput
        label="Alias"
        value={config.alias || ""}
        onChange={(v) => updateConfig("alias", v)}
        placeholder={`e.g. Work ${label}`}
        hint="How the agent refers to this account when it has more than one."
      />

      <AgentActionPicker
        type={type}
        value={config.enabledActions}
        onChange={(v) => updateConfig("enabledActions", v)}
        accentColor={ACCENT}
      />
    </ConfigSection>
  );
}
