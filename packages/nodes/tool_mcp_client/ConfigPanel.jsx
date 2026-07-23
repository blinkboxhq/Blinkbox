import { useState, useEffect, useCallback, useRef } from 'react';
import { Network, Server, KeyRound, ListFilter, Timer, ShieldCheck, List, Tag, Unlink, Wrench } from 'lucide-react';
import api, { API_URL } from '@/lib/api';
import { openOAuthPopup } from '@/lib/oauthConnect';
import { faviconUrl } from '@/lib/favicon';
import {
  ConfigSection,
  ConfigDivider,
  ConfigInput,
  ConfigLabel,
  ConfigTextarea,
  ConfigToggleRow,
  ConfigBanner,
  ToolHeader,
  GuardrailNote,
  ConnectButton,
  Text,
  NumberField,
} from '@nodes/agent_tool_panel/ToolKit.jsx';

const ACCENT = '#2dd4bf';

const csv = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

// The backend still reads a mode, but nobody should have to pick one: what the
// user filled in already says which mode it is.
function deriveAuthType(config) {
  if (config.credentialId) return 'oauth';
  if (config.authToken && config.authHeader) return 'header';
  if (config.authToken) return 'bearer';
  return 'none';
}

// Every tool the server exposes, each with its own switch. Off means the agent
// cannot call it, no matter what it decides at runtime.
function ToolAllowList({ tools, value, onChange }) {
  const allowed = csv(value);
  const allOn = tools.every((t) => allowed.includes(t.name));

  return (
    <div className="flex flex-col gap-2">
      <ConfigLabel
        icon={ListFilter}
        action={
          <button
            type="button"
            onClick={() => onChange(allOn ? '' : tools.map((t) => t.name).join(','))}
            className="text-[9px] font-mono uppercase tracking-wider text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            {allOn ? 'Block all' : 'Allow all'}
          </button>
        }
      >
        Allowed Tools · {allowed.length}/{tools.length}
      </ConfigLabel>

      <div className="flex flex-col gap-1.5 max-h-[340px] overflow-y-auto pr-0.5">
        {tools.map((t) => (
          <ConfigToggleRow
            key={t.name}
            label={t.name}
            desc={t.description || 'No description provided by the server.'}
            icon={Wrench}
            accentColor={ACCENT}
            on={allowed.includes(t.name)}
            onChange={(on) =>
              onChange(
                (on ? [...allowed, t.name] : allowed.filter((n) => n !== t.name)).join(','),
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

export default function ToolMcpClientPanel({ config = {}, updateConfig, nodeId }) {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const cancelSignInRef = useRef(null);

  const serverUrl = (config.serverUrl || '').trim();
  const discovered = Array.isArray(config.discoveredTools) ? config.discoveredTools : [];
  const signedIn = !!config.credentialId;
  const logo = faviconUrl(serverUrl);

  // One writer for the auth fields so the stored mode can never drift out of
  // step with the values it describes.
  const setAuth = (key, value) => {
    const next = { ...config, [key]: value };
    updateConfig(key, value);
    updateConfig('authType', deriveAuthType(next));
  };

  const connect = useCallback(async () => {
    setStatus('loading');
    setMessage('');
    try {
      const { data } = await api.post('/api/mcp-client/probe', {
        serverUrl,
        authType: deriveAuthType(config),
        authToken: config.authToken,
        authHeader: config.authHeader,
        headers: config.headers,
        timeoutMs: config.timeoutMs,
        credentialId: config.credentialId,
      });
      const tools = data.tools || [];
      updateConfig('discoveredTools', tools);
      if (data.server?.name && !config.serverName) updateConfig('serverName', data.server.name);
      // Arriving with nothing allowed would read as "connected but broken", and
      // an empty list means "everything" to the executor anyway — so make that
      // explicit and let the user switch off what they don't want.
      if (!csv(config.allowedTools).length) {
        updateConfig('allowedTools', tools.map((t) => t.name).join(','));
      }
      setStatus('ok');
      setMessage(
        `${data.server?.name || 'Server'} online — ${tools.length} tool${tools.length === 1 ? '' : 's'} available.`,
      );
    } catch (err) {
      const res = err.response?.data;
      setStatus('error');
      setMessage(
        res?.needsAuth
          ? 'This server wants a sign-in. Use "Sign in with browser" below, then connect again.'
          : res?.message || err.message || 'Could not reach that server.',
      );
    }
  }, [serverUrl, config, updateConfig]);

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
    if (config.oauthClientSecret) params.set('clientSecret', config.oauthClientSecret);

    cancelSignInRef.current = openOAuthPopup({
      url: `${API_URL}/api/mcp-client/oauth/authorize?${params.toString()}`,
      name: 'blinkbox_mcp_oauth',
      match: (c) => c.type === 'mcp_oauth',
      onCredential: (cred) => {
        updateConfig('credentialId', cred._id);
        updateConfig('credentialName', cred.name);
        updateConfig('authType', 'oauth');
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
    updateConfig('authType', deriveAuthType({ ...config, credentialId: '' }));
    setStatus('idle');
    setMessage('');
  };

  return (
    <ConfigSection>
      <ToolHeader
        icon={Network}
        logoUrl={logo}
        iconColor={ACCENT}
        title={config.serverName || 'MCP Client'}
        subtitle={serverUrl || 'Calls a tool on an external MCP server'}
      />

      <GuardrailNote>
        {serverUrl
          ? 'Locked to the server below. The agent only chooses which of its tools to call.'
          : 'No server set — the agent picks the endpoint itself. Pin one below unless you meant that.'}
      </GuardrailNote>

      <Text
        label="Name"
        icon={Tag}
        value={config.serverName}
        onChange={(v) => updateConfig('serverName', v)}
        placeholder="Fills in from the server on connect"
        nodeId={nodeId}
        hint="Becomes this node's name on the canvas."
      />

      <Text
        label="Server URL"
        icon={Server}
        value={config.serverUrl}
        onChange={(v) => updateConfig('serverUrl', v)}
        placeholder="https://mcp.example.com/mcp"
        nodeId={nodeId}
        hint="Streamable HTTP or SSE — Blinkbox tries both. Usually all you need."
      />

      <ConnectButton
        label={discovered.length ? 'Reconnect' : 'Connect'}
        accentColor={ACCENT}
        status={status}
        message={message}
        disabled={!serverUrl && !signedIn}
        onClick={connect}
      />

      <ConfigDivider label="Sign-in" />

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
        <>
          <ConnectButton
            label="Sign in with browser"
            accentColor={ACCENT}
            status={signingIn ? 'loading' : 'idle'}
            disabled={!serverUrl}
            onClick={signIn}
          />
          <ConfigBanner tone="info">
            Only for servers that ask you to log in. Most register Blinkbox on their own —
            fill the two fields below only if yours says it can&apos;t.
          </ConfigBanner>
          <ConfigInput
            label="Client ID"
            icon={KeyRound}
            value={config.oauthClientId || ''}
            onChange={(v) => updateConfig('oauthClientId', v)}
            placeholder="Optional"
          />
          <ConfigInput
            label="Client Secret"
            icon={KeyRound}
            type="password"
            value={config.oauthClientSecret || ''}
            onChange={(v) => updateConfig('oauthClientSecret', v)}
            placeholder="Optional"
          />
        </>
      )}

      <ConfigDivider label="Tools" />

      {discovered.length > 0 ? (
        <>
          <ToolAllowList
            tools={discovered}
            value={config.allowedTools}
            onChange={(v) => updateConfig('allowedTools', v)}
          />
          <GuardrailNote>
            {csv(config.allowedTools).length
              ? 'The agent can only call the tools switched on above.'
              : 'Nothing switched on means every tool this server exposes is callable.'}
          </GuardrailNote>
        </>
      ) : (
        <ConfigBanner tone="info">
          Connect above and every tool this server exposes gets listed here, each with its
          own switch.
        </ConfigBanner>
      )}

      <ConfigDivider label="Advanced" />

      <ConfigToggleRow
        label="Show advanced settings"
        desc="Static tokens, extra headers, host allowlist and timeout."
        icon={ShieldCheck}
        accentColor={ACCENT}
        on={showAdvanced}
        onChange={setShowAdvanced}
      />

      {showAdvanced && (
        <>
          <ConfigInput
            label="Access Token"
            icon={KeyRound}
            type="password"
            value={config.authToken || ''}
            onChange={(v) => setAuth('authToken', v)}
            placeholder="Sent as Authorization: Bearer …"
            hint="Only for servers that hand out a static token instead of a sign-in."
          />

          <ConfigInput
            label="Send Token As Header"
            icon={Tag}
            value={config.authHeader || ''}
            onChange={(v) => setAuth('authHeader', v)}
            placeholder="X-API-Key"
            hint="Leave empty to send it as a bearer token."
          />

          <ConfigTextarea
            label="Extra Headers"
            icon={List}
            rows={3}
            value={config.headers || ''}
            onChange={(v) => updateConfig('headers', v)}
            placeholder={'X-Tenant: acme\nX-Env: prod'}
            hint="One per line, Key: value."
          />

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
        </>
      )}
    </ConfigSection>
  );
}
