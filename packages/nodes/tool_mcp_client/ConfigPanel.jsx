import { Network, Server, KeyRound, ListFilter, Timer } from 'lucide-react';
import {
  ConfigSection,
  ConfigDivider,
  ConfigInput,
  ToolHeader,
  GuardrailNote,
  Text,
  NumberField,
} from '@nodes/agent_tool_panel/ToolKit.jsx';

const ACCENT = '#2dd4bf';

export default function ToolMcpClientPanel({ config = {}, updateConfig, nodeId }) {
  const pinned = Boolean((config.serverUrl || '').trim());

  return (
    <ConfigSection>
      <ToolHeader
        icon={Network}
        iconColor={ACCENT}
        title="MCP Client"
        subtitle="Calls a tool on an external MCP server"
      />

      <GuardrailNote>
        {pinned
          ? 'Locked to the server below. The agent only chooses which of its tools to call.'
          : 'No server set — the agent picks the endpoint itself. Pin one below unless you meant that.'}
      </GuardrailNote>

      <Text
        label="Server URL"
        icon={Server}
        value={config.serverUrl}
        onChange={(v) => updateConfig('serverUrl', v)}
        placeholder="https://mcp.example.com"
        nodeId={nodeId}
        hint="Blinkbox appends /tools/call to this."
      />

      <ConfigInput
        label="Auth Token"
        icon={KeyRound}
        type="password"
        value={config.authToken || ''}
        onChange={(v) => updateConfig('authToken', v)}
        placeholder="Sent as Authorization: Bearer …"
      />

      <ConfigDivider label="Limits" />

      <Text
        label="Allowed Tools"
        icon={ListFilter}
        value={config.allowedTools}
        onChange={(v) => updateConfig('allowedTools', v)}
        placeholder="search_docs, list_files"
        nodeId={nodeId}
        hint="Comma separated, exact names. Empty = every tool the server exposes."
      />

      <NumberField
        label="Timeout (ms)"
        icon={Timer}
        value={config.timeoutMs}
        onChange={(v) => updateConfig('timeoutMs', v)}
        placeholder="30000"
      />
    </ConfigSection>
  );
}
