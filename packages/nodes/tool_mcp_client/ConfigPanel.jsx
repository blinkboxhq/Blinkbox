import { useState } from 'react';
import { Network, Server, KeyRound, ListFilter, Timer, ShieldCheck, List, Tag } from 'lucide-react';
import api from '@/lib/api';
import {
  ConfigSection,
  ConfigDivider,
  ConfigInput,
  ConfigPills,
  ConfigTextarea,
  ToolHeader,
  GuardrailNote,
  ConnectButton,
  Text,
  NumberField,
  CsvPills,
} from '@nodes/agent_tool_panel/ToolKit.jsx';

const ACCENT = '#2dd4bf';

const AUTH_MODES = [
  { value: 'none', label: 'None' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'header', label: 'API Key Header' },
];

export default function ToolMcpClientPanel({ config = {}, updateConfig, nodeId }) {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const serverUrl = (config.serverUrl || '').trim();
  const authType = config.authType || (config.authToken ? 'bearer' : 'none');
  const discovered = Array.isArray(config.discoveredTools) ? config.discoveredTools : [];

  const connect = async () => {
    setStatus('loading');
    setMessage('');
    try {
      const { data } = await api.post('/api/mcp-client/probe', {
        serverUrl,
        authType,
        authToken: config.authToken,
        authHeader: config.authHeader,
        headers: config.headers,
        timeoutMs: config.timeoutMs,
      });
      const tools = data.tools || [];
      updateConfig('discoveredTools', tools);
      updateConfig('serverName', data.server?.name || '');
      setStatus('ok');
      setMessage(
        `Connected to ${data.server?.name || 'server'} — ${tools.length} tool${tools.length === 1 ? '' : 's'} available.`,
      );
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || err.message || 'Could not reach that server.');
    }
  };

  return (
    <ConfigSection>
      <ToolHeader
        icon={Network}
        iconColor={ACCENT}
        title="MCP Client"
        subtitle="Calls a tool on an external MCP server"
      />

      <GuardrailNote>
        {serverUrl
          ? 'Locked to the server below. The agent only chooses which of its tools to call.'
          : 'No server set — the agent picks the endpoint itself. Pin one below unless you meant that.'}
      </GuardrailNote>

      <Text
        label="Server URL"
        icon={Server}
        value={config.serverUrl}
        onChange={(v) => updateConfig('serverUrl', v)}
        placeholder="https://mcp.example.com/mcp"
        nodeId={nodeId}
        hint="Streamable HTTP or SSE — Blinkbox tries both."
      />

      <ConfigPills
        label="Authentication"
        icon={KeyRound}
        accentColor={ACCENT}
        value={authType}
        onChange={(v) => updateConfig('authType', v)}
        options={AUTH_MODES}
      />

      {authType === 'header' && (
        <ConfigInput
          label="Header Name"
          icon={Tag}
          value={config.authHeader || ''}
          onChange={(v) => updateConfig('authHeader', v)}
          placeholder="X-API-Key"
        />
      )}

      {authType !== 'none' && (
        <ConfigInput
          label={authType === 'bearer' ? 'Bearer Token' : 'Key Value'}
          icon={KeyRound}
          type="password"
          value={config.authToken || ''}
          onChange={(v) => updateConfig('authToken', v)}
          placeholder={authType === 'bearer' ? 'Sent as Authorization: Bearer …' : 'Sent as the header value'}
        />
      )}

      <ConfigTextarea
        label="Extra Headers"
        icon={List}
        rows={3}
        value={config.headers || ''}
        onChange={(v) => updateConfig('headers', v)}
        placeholder={'X-Tenant: acme\nX-Env: prod'}
        hint="One per line, Key: value."
      />

      <ConnectButton
        label={discovered.length ? 'Reconnect' : 'Connect'}
        accentColor={ACCENT}
        status={status}
        message={message}
        disabled={!serverUrl}
        onClick={connect}
      />

      <ConfigDivider label="Limits" />

      {discovered.length > 0 ? (
        <CsvPills
          label="Allowed Tools"
          icon={ListFilter}
          accentColor={ACCENT}
          value={config.allowedTools}
          onChange={(v) => updateConfig('allowedTools', v)}
          options={discovered.map((t) => ({ value: t.name, label: t.name }))}
        />
      ) : (
        <Text
          label="Allowed Tools"
          icon={ListFilter}
          value={config.allowedTools}
          onChange={(v) => updateConfig('allowedTools', v)}
          placeholder="search_docs, list_files"
          nodeId={nodeId}
          hint="Comma separated. Connect above to pick from the real list instead."
        />
      )}

      <GuardrailNote>
        {config.allowedTools
          ? 'The agent can only call the tools selected above.'
          : 'Nothing selected means every tool the server exposes is callable.'}
      </GuardrailNote>

      <Text
        label="Allowed Hosts"
        icon={ShieldCheck}
        value={config.allowedHosts}
        onChange={(v) => updateConfig('allowedHosts', v)}
        placeholder="mcp.example.com"
        nodeId={nodeId}
        hint="Comma separated. Empty = any host that passes the SSRF guard."
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
