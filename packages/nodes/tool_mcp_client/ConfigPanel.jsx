import { useState, useEffect, useCallback, useRef } from 'react';
import { Network, Server, KeyRound, ListFilter, Timer, ShieldCheck, List, Tag, Unlink } from 'lucide-react';
import api, { API_URL } from '@/lib/api';
import { openOAuthPopup } from '@/lib/oauthConnect';
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
  { value: 'oauth', label: 'Sign In' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'header', label: 'API Key Header' },
];

export default function ToolMcpClientPanel({ config = {}, updateConfig, nodeId }) {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const cancelSignInRef = useRef(null);

  const serverUrl = (config.serverUrl || '').trim();
  const authType = config.authType || (config.authToken ? 'bearer' : 'none');
  const discovered = Array.isArray(config.discoveredTools) ? config.discoveredTools : [];
  const signedIn = authType === 'oauth' && !!config.credentialId;

  const connect = useCallback(async () => {
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
        credentialId: config.credentialId,
      });
      const tools = data.tools || [];
      updateConfig('discoveredTools', tools);
      updateConfig('serverName', data.server?.name || '');
      setStatus('ok');
      setMessage(
        `Connected to ${data.server?.name || 'server'} — ${tools.length} tool${tools.length === 1 ? '' : 's'} available.`,
      );
    } catch (err) {
      const res = err.response?.data;
      setStatus('error');
      setMessage(
        res?.needsAuth
          ? 'This server requires a sign-in. Switch Authentication to Sign In and log in.'
          : res?.message || err.message || 'Could not reach that server.',
      );
    }
  }, [serverUrl, authType, config.authToken, config.authHeader, config.headers, config.timeoutMs, config.credentialId, updateConfig]);

  useEffect(() => () => cancelSignInRef.current?.(), []);

  const signIn = () => {
    const token = localStorage.getItem('blinkbox_token');
    if (!token) {
      setStatus('error');
      setMessage('Not authenticated. Log in again.');
      return;
    }
    cancelSignInRef.current?.();
    setSigningIn(true);
    setStatus('idle');
    setMessage('');

    const params = new URLSearchParams({ token, serverUrl });
    if (config.oauthClientId) params.set('clientId', config.oauthClientId);

    cancelSignInRef.current = openOAuthPopup({
      url: `${API_URL}/api/mcp-client/oauth/authorize?${params.toString()}`,
      name: 'blinkbox_mcp_oauth',
      match: (c) => c.type === 'mcp_oauth',
      onCredential: (cred) => {
        updateConfig('credentialId', cred._id);
        updateConfig('credentialName', cred.name);
        if (!serverUrl && cred.serverUrl) updateConfig('serverUrl', cred.serverUrl);
        setStatus('idle');
        setMessage(`Signed in as ${cred.name}. Hit Connect to load tools.`);
      },
      onError: (msg) => {
        if (!msg) return;
        setStatus('error');
        setMessage(msg);
      },
      onSettled: () => { setSigningIn(false); cancelSignInRef.current = null; },
    });
  };

  const signOut = () => {
    updateConfig('credentialId', '');
    updateConfig('credentialName', '');
    updateConfig('discoveredTools', []);
    setStatus('idle');
    setMessage('');
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

      {authType === 'oauth' && (
        <>
          {signedIn ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-[#2b2b2b] bg-[#0f0f0f] px-3 py-2.5">
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-mono text-neutral-300 truncate">
                  {config.credentialName || 'Signed in'}
                </span>
                <span className="text-[10px] text-neutral-600">Token refreshes automatically.</span>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="shrink-0 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                <Unlink className="w-3 h-3" />
                Sign out
              </button>
            </div>
          ) : (
            <ConnectButton
              label="Sign in with browser"
              accentColor={ACCENT}
              status={signingIn ? 'loading' : 'idle'}
              disabled={!serverUrl}
              onClick={signIn}
            />
          )}

          <ConfigInput
            label="Client ID (optional)"
            icon={KeyRound}
            value={config.oauthClientId || ''}
            onChange={(v) => updateConfig('oauthClientId', v)}
            placeholder="Only if the server has no self-registration"
          />
        </>
      )}

      {authType === 'header' && (
        <ConfigInput
          label="Header Name"
          icon={Tag}
          value={config.authHeader || ''}
          onChange={(v) => updateConfig('authHeader', v)}
          placeholder="X-API-Key"
        />
      )}

      {(authType === 'bearer' || authType === 'header') && (
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
        disabled={!serverUrl && !signedIn}
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
