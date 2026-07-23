import { Webhook, Link2, ShieldCheck, Braces, Timer } from 'lucide-react';
import {
  ConfigSection,
  ConfigDivider,
  ConfigTextarea,
  ToolHeader,
  GuardrailNote,
  Text,
  NumberField,
} from '@nodes/agent_tool_panel/ToolKit.jsx';

const ACCENT = '#a1a1aa';

export default function ToolWebhookPanel({ config = {}, updateConfig, nodeId }) {
  const pinned = Boolean((config.url || '').trim());

  return (
    <ConfigSection>
      <ToolHeader
        icon={Webhook}
        iconColor={ACCENT}
        title="Send Webhook"
        subtitle="POSTs a JSON payload the agent builds"
      />

      <GuardrailNote>
        {pinned
          ? 'This node always posts to the URL below. The agent only decides what to send.'
          : 'No URL set — the agent chooses where to post. Pin one below to lock the destination.'}
      </GuardrailNote>

      <Text
        label="Destination URL"
        icon={Link2}
        value={config.url}
        onChange={(v) => updateConfig('url', v)}
        placeholder="https://hooks.slack.com/services/…"
        nodeId={nodeId}
        hint="Leave empty to let the agent pick the URL."
      />

      <Text
        label="Allowed Hosts"
        icon={ShieldCheck}
        value={config.allowedHosts}
        onChange={(v) => updateConfig('allowedHosts', v)}
        placeholder="hooks.slack.com, example.com"
        nodeId={nodeId}
        hint="Comma separated. Worth setting whenever the URL above is empty."
      />

      <ConfigDivider label="Request" />

      <ConfigTextarea
        label="Always Send These Headers"
        icon={Braces}
        rows={3}
        value={config.headers || ''}
        onChange={(v) => updateConfig('headers', v)}
        placeholder={'X-Signature: abc123\nX-Source: blinkbox'}
        hint="One per line, Key: value. These win over anything the agent sets."
      />

      <NumberField
        label="Timeout (ms)"
        icon={Timer}
        value={config.timeoutMs}
        onChange={(v) => updateConfig('timeoutMs', v)}
        placeholder="15000"
      />
    </ConfigSection>
  );
}
