import { Globe, ShieldCheck, ListFilter, Timer, HardDrive, Braces } from 'lucide-react';
import {
  ConfigSection,
  ConfigDivider,
  ConfigTextarea,
  ToolHeader,
  GuardrailNote,
  Text,
  NumberField,
  CsvPills,
} from '@nodes/agent_tool_panel/ToolKit.jsx';

const ACCENT = '#3b82f6';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function ToolHttpRequestPanel({ config = {}, updateConfig, nodeId }) {
  return (
    <ConfigSection>
      <ToolHeader
        icon={Globe}
        iconColor={ACCENT}
        title="HTTP Request"
        subtitle="Lets the agent call any API"
      />

      <GuardrailNote>
        The agent picks the URL and method at run time. Everything below narrows what it
        is allowed to pick — leave a field empty to place no limit on it.
      </GuardrailNote>

      <Text
        label="Allowed Hosts"
        icon={ShieldCheck}
        value={config.allowedHosts}
        onChange={(v) => updateConfig('allowedHosts', v)}
        placeholder="api.stripe.com, github.com"
        nodeId={nodeId}
        hint="Comma separated. Subdomains are included. Empty = any host."
      />

      <CsvPills
        label="Allowed Methods"
        icon={ListFilter}
        value={config.allowedMethods}
        onChange={(v) => updateConfig('allowedMethods', v)}
        options={METHODS}
        accentColor={ACCENT}
      />

      <ConfigDivider label="Request" />

      <ConfigTextarea
        label="Always Send These Headers"
        icon={Braces}
        rows={3}
        value={config.headers || ''}
        onChange={(v) => updateConfig('headers', v)}
        placeholder={'Authorization: Bearer abc123\nX-Api-Version: 2024-01'}
        hint="One per line, Key: value. The agent can add more but cannot overwrite auth you set here."
      />

      <NumberField
        label="Timeout (ms)"
        icon={Timer}
        value={config.timeoutMs}
        onChange={(v) => updateConfig('timeoutMs', v)}
        placeholder="30000"
      />

      <NumberField
        label="Max Response Size (KB)"
        icon={HardDrive}
        value={config.maxResponseKb}
        onChange={(v) => updateConfig('maxResponseKb', v)}
        placeholder="2048"
        hint="Bigger responses are rejected before they reach the model."
      />
    </ConfigSection>
  );
}
