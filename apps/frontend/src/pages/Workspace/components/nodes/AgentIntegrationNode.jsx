import CredentialPicker from "../../../../components/ui/CredentialPicker";

// Per-platform config: logo path, accent color, oauth provider, capabilities
const PLATFORM_META = {
  agent_integration_slack:          { label: "Slack",           logo: "/src/assets/slack.png",                                    color: "#E01E5A", oauth: "slack",     caps: ["Post messages","Upload files","Create channels","Add reactions","Invite users"] },
  agent_integration_gmail:          { label: "Gmail",           logo: "/src/assets/gmail.png",                                    color: "#EA4335", oauth: "google",    caps: ["Send email","Search inbox","Read messages","Create drafts","Manage labels"] },
  agent_integration_discord:        { label: "Discord",         logo: "/src/assets/discord.png",                                  color: "#5865F2", oauth: null,        caps: ["Post to channels","Send DMs","Create threads","Add reactions","Manage roles"] },
  agent_integration_telegram:       { label: "Telegram",        logo: "/src/assets/telegram.png",                                 color: "#229ED9", oauth: null,        caps: ["Send messages","Send media","Create polls","Pin messages","Manage groups"] },
  agent_integration_notion:         { label: "Notion",          logo: "/src/assets/notion.svg",       filter: "invert(1)",        color: "#a1a1aa", oauth: "notion",    caps: ["Create pages","Query databases","Update blocks","Search workspace","Add comments"] },
  agent_integration_airtable:       { label: "Airtable",        logo: "/src/assets/Airtable--Streamline-Svg-Logos.svg",           color: "#F82B60", oauth: "airtable",  caps: ["Create records","List records","Update records","Delete records","Search bases"] },
  agent_integration_google_sheets:  { label: "Google Sheets",   logo: "/src/assets/google-sheets.svg",                           color: "#34A853", oauth: "google",    caps: ["Append rows","Read rows","Update cells","Create sheets","Clear ranges"] },
  agent_integration_google_calendar:{ label: "Google Calendar", logo: "/src/assets/google-calendar.svg",                         color: "#4285F4", oauth: "google",    caps: ["Create events","List events","Update events","Delete events","Check availability"] },
  agent_integration_google_drive:   { label: "Google Drive",    logo: "/src/assets/google-drive.svg",                            color: "#FBBC05", oauth: "google",    caps: ["Upload files","List files","Share files","Create folders","Download files"] },
  agent_integration_outlook:        { label: "Outlook",         logo: "/src/assets/outlook.svg",                                  color: "#0078D4", oauth: "microsoft", caps: ["Send email","Read inbox","Create calendar events","Manage contacts","Search mail"] },
  agent_integration_github:         { label: "GitHub",          logo: "/src/assets/github.svg",       filter: "invert(1)",        color: "#e8eaea", oauth: "github",    caps: ["Create issues","Comment on PRs","Merge PRs","Create gists","Manage repos"] },
  agent_integration_linear:         { label: "Linear",          logo: "/src/assets/linear.svg",                                   color: "#5E6AD2", oauth: null,        caps: ["Create issues","Update status","Assign issues","Add comments","Create projects"] },
  agent_integration_hubspot:        { label: "HubSpot",         logo: "/src/assets/hubspot.svg",                                  color: "#FF7A59", oauth: null,        caps: ["Create contacts","Update deals","Log activities","Search CRM","Create tasks"] },
  agent_integration_jira:           { label: "Jira",            logo: "/src/assets/jira.svg",                                     color: "#0052CC", oauth: null,        caps: ["Create tickets","Update status","Assign issues","Add comments","Search issues"] },
  agent_integration_asana:          { label: "Asana",           logo: "/src/assets/asana.svg",                                    color: "#F06A6A", oauth: null,        caps: ["Create tasks","Update tasks","Assign tasks","Create projects","Add subtasks"] },
  agent_integration_stripe:         { label: "Stripe",          logo: "/src/assets/stripe.svg",                                   color: "#635BFF", oauth: null,        caps: ["Create charges","Get customer","Create invoices","Refund payments","List transactions"] },
  agent_integration_shopify:        { label: "Shopify",         logo: "/src/assets/shopify.svg",                                  color: "#95BF47", oauth: null,        caps: ["Get orders","Update products","Create discounts","List customers","Manage inventory"] },
  agent_integration_clickup:        { label: "ClickUp",         logo: "/src/assets/clickup.svg",                                  color: "#7B68EE", oauth: null,        caps: ["Create tasks","Update status","Add comments","Create lists","Assign members"] },
  agent_integration_twilio:         { label: "Twilio",          logo: "/src/assets/Twilio-Icon--Streamline-Svg-Logos.svg",        color: "#F22F46", oauth: null,        caps: ["Send SMS","Make calls","Send WhatsApp","Lookup numbers","Create conversations"] },
  agent_integration_mongodb:        { label: "MongoDB",         logo: "/src/assets/mongodb.svg",                                  color: "#4DB33D", oauth: null,        caps: ["Find documents","Insert documents","Update records","Delete records","Aggregate data"] },
  agent_integration_postgres:       { label: "PostgreSQL",      logo: "/src/assets/postgresql.svg",                               color: "#336791", oauth: null,        caps: ["Run SELECT","INSERT rows","UPDATE records","DELETE records","Execute procedures"] },
  agent_integration_redis:          { label: "Redis",           logo: "/src/assets/redis.svg",                                    color: "#DC382D", oauth: null,        caps: ["GET key","SET key","Delete key","List keys","Pub/Sub messaging"] },
};

export default function AgentIntegrationNode({ config = {}, updateConfig, nodeId, backendType }) {
  const meta = PLATFORM_META[backendType] || {};
  const { label, logo, filter, color, oauth, caps = [] } = meta;

  return (
    <div className="flex flex-col gap-4 w-full">

      {/* Header */}
      <div className="relative overflow-hidden rounded-xl" style={{ background: color + "12", border: `1px solid ${color}30` }}>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "20", border: `1px solid ${color}40` }}>
            {logo && <img src={logo} alt={label} className="w-5 h-5 object-contain" style={filter ? { filter } : undefined} />}
          </div>
          <div>
            <p className="text-[13px] font-bold text-zinc-100">{label}</p>
            <p className="text-[10px] text-zinc-500">Agent Integration</p>
          </div>
        </div>
      </div>

      {/* Credential */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Connect Account</label>
        <CredentialPicker
          label={`${label} Credential`}
          value={config.credentialId || ""}
          onChange={v => updateConfig("credentialId", v)}
          accentColor="blue"
          oauthProvider={oauth}
          placeholder={`Select ${label} credential…`}
        />
        {!config.credentialId && (
          <p className="text-[10px] text-zinc-600">
            {oauth
              ? `Click "Connect" above to authorize ${label} via OAuth.`
              : `Paste your ${label} API key in the credential vault first.`}
          </p>
        )}
      </div>

      {/* Alias */}
      <div>
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Alias (optional)</label>
        <input
          value={config.alias || ""}
          onChange={e => updateConfig("alias", e.target.value)}
          placeholder={`e.g. "Work ${label}"`}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-[12px] text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-600"
        />
        <p className="text-[9px] text-zinc-700 mt-1">The agent uses this name to refer to this integration.</p>
      </div>

      {/* Capabilities */}
      {caps.length > 0 && (
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">What the agent can do</label>
          <div className="flex flex-col gap-1">
            {caps.map(cap => (
              <div key={cap} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800/40">
                <div className="w-1 h-1 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-[11px] text-zinc-400">{cap}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/40">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.credentialId ? "bg-emerald-500" : "bg-zinc-700"}`} />
        <span className="text-[9px] text-zinc-600">
          {config.credentialId ? `Connected — agent can use ${label}` : "Not connected — add a credential to activate"}
        </span>
      </div>
    </div>
  );
}
