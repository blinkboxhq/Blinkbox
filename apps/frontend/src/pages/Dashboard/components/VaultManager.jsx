import { useState, useEffect, useCallback, useRef } from 'react';
import { Key, Plus, Trash2, Shield, Loader2, Copy, CheckCheck, Pencil, Link2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../lib/api';

import logoGoogle from '../../../assets/credentials/google-color.svg';
import logoGithub from '../../../assets/credentials/github.svg';
import logoNotion from '../../../assets/credentials/notion.svg';
import logoSlack from '../../../assets/credentials/slack-new-logo-logo-svgrepo-com.svg';
import logoAirtable from '../../../assets/credentials/Airtable--Streamline-Svg-Logos.svg';
import logoMicrosoft from '../../../assets/credentials/microsoft-color.svg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TYPE_LABELS = {
  bearer: 'Bearer Token',
  api_key: 'API Key',
  basic: 'Basic Auth',
  oauth: 'OAuth',
};

const OAUTH_APPS = [
  { provider: 'google',    label: 'Google',    desc: 'Gmail, Sheets, Drive, Calendar, YouTube', color: '#4285F4', logo: logoGoogle },
  { provider: 'slack',     label: 'Slack',     desc: 'Post messages, manage channels',           color: '#E01E5A', logo: logoSlack },
  { provider: 'github',    label: 'GitHub',    desc: 'Issues, PRs, repos, webhooks',             color: '#e8eaea', logo: logoGithub,    invert: true },
  { provider: 'notion',    label: 'Notion',    desc: 'Pages, databases, content',                color: '#e8eaea', logo: logoNotion,    invert: true },
  { provider: 'airtable',  label: 'Airtable',  desc: 'Bases, tables, records',                   color: '#F82B60', logo: logoAirtable },
  { provider: 'microsoft', label: 'Microsoft', desc: 'Teams, Outlook, OneDrive',                 color: '#0078D4', logo: logoMicrosoft },
];

const APP_BY_PROVIDER = Object.fromEntries(OAUTH_APPS.map(a => [a.provider, a]));

export default function VaultManager() {
  const [credentials, setCredentials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showOAuth, setShowOAuth] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editSecret, setEditSecret] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState(null);
  const [connectingProvider, setConnectingProvider] = useState(null);

  const [name, setName] = useState('');
  const [type, setType] = useState('bearer');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState(null);

  const popupRef = useRef(null);
  const messageHandlerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (messageHandlerRef.current) {
        window.removeEventListener('message', messageHandlerRef.current);
      }
    };
  }, []);

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await api.get('/api/credentials');
      setCredentials(res.data.credentials || []);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const connectOAuth = (provider) => {
    const token = localStorage.getItem('blinkbox_token');
    if (!token) return;

    setConnectingProvider(provider);

    if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
    if (messageHandlerRef.current) window.removeEventListener('message', messageHandlerRef.current);

    const popup = window.open(
      `${API_URL}/api/oauth/${provider}/authorize?token=${encodeURIComponent(token)}`,
      'blinkbox_oauth',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );
    popupRef.current = popup;

    const handler = (e) => {
      if (e.data?.type !== 'blinkbox:oauth') return;
      const { payload } = e.data;
      window.removeEventListener('message', handler);
      messageHandlerRef.current = null;
      setConnectingProvider(null);

      if (payload?.success && payload?.credential) {
        toast.success(`${payload.credential.name} connected successfully`);
        // Re-fetch the full list so the new credential renders with all server-side fields
        fetchCredentials();
      } else if (payload?.error) {
        toast.error(payload.error);
      }
    };

    messageHandlerRef.current = handler;
    window.addEventListener('message', handler);

    const pollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollTimer);
        if (messageHandlerRef.current) {
          window.removeEventListener('message', messageHandlerRef.current);
          messageHandlerRef.current = null;
        }
        setConnectingProvider(null);
      }
    }, 500);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !secret.trim()) {
      setError('Name and secret are required.');
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const res = await api.post('/api/credentials', { name: name.trim(), type, secret });
      setCredentials([res.data.credential, ...credentials]);
      setName(''); setType('bearer'); setSecret(''); setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create credential.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (id) => {
    if (!editSecret.trim()) { setEditError('Secret is required.'); return; }
    setIsUpdating(true); setEditError(null);
    try {
      await api.patch(`/api/credentials/${id}`, { secret: editSecret });
      setEditingId(null); setEditSecret('');
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update credential.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/credentials/${id}`);
      setCredentials(credentials.filter((c) => c._id !== id));
      toast.success('Credential deleted');
    } catch {
      toast.error('Failed to delete credential');
    }
  };

  const oauthCreds = credentials.filter(c => c.type === 'oauth');
  const connectedProviders = new Set(oauthCreds.map(c => c.provider));

  return (
    <div className="max-w-[1100px] mx-auto w-full" style={{ animation: 'dbFadeIn 0.15s ease-out' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-[18px] font-bold text-[var(--bb-text-hi)] tracking-tight">Credentials</h2>
          <p className="text-[12px] text-[var(--bb-text-lo)] mt-0.5">AES-256-GCM encrypted. Secrets never leave the server.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bb-card flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold text-[var(--bb-text-mid)] hover:text-[var(--bb-text-hi)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Credential
        </button>
      </div>

      {/* OAuth Connected Apps */}
      <div className="mb-8">
        <button
          onClick={() => setShowOAuth(v => !v)}
          className="flex items-center gap-2 w-full mb-4 group"
        >
          <Link2 className="w-3.5 h-3.5 text-[var(--bb-text-lo)]" />
          <span className="bb-eyebrow">Connected Apps</span>
          {connectedProviders.size > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ color: 'var(--bb-accent-hot)', background: 'var(--bb-accent-soft)', border: '1px solid var(--bb-accent-ring)' }}>{connectedProviders.size}</span>
          )}
          <div className="ml-auto">
            {showOAuth ? <ChevronUp className="w-3.5 h-3.5 text-[var(--bb-text-dim)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--bb-text-dim)]" />}
          </div>
        </button>

        {showOAuth && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {OAUTH_APPS.map(app => {
              const connected = connectedProviders.has(app.provider);
              const isConnecting = connectingProvider === app.provider;
              const appCreds = oauthCreds.filter(c => c.provider === app.provider);
              return (
                <div key={app.provider} className="bb-card bb-liquid rounded-2xl flex flex-col gap-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={app.logo}
                        alt={app.label}
                        className="w-7 h-7 shrink-0 object-contain"
                        style={app.invert ? { filter: 'brightness(0) invert(1)' } : undefined}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--bb-text-hi)] truncate">{app.label}</p>
                        <p className="text-[10px] text-[var(--bb-text-dim)] mt-0.5 leading-tight truncate">{app.desc}</p>
                      </div>
                    </div>
                    {connected && <CheckCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--bb-accent)' }} />}
                  </div>
                  <button
                    onClick={() => connectOAuth(app.provider)}
                    disabled={isConnecting}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-60"
                    style={
                      connected
                        ? { color: 'var(--bb-text-mid)', border: '1px solid var(--bb-border)', background: 'var(--bb-surface-1)' }
                        : { color: 'var(--bb-accent-hot)', border: '1px solid var(--bb-accent-ring)', background: 'var(--bb-accent-soft)' }
                    }
                  >
                    {isConnecting
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Link2 className="w-3 h-3" />
                    }
                    {connected ? 'Add another' : 'Connect'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Connected OAuth credentials — shown with their provider logo */}
      {oauthCreds.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bb-divider border-t" />
            <span className="bb-eyebrow">Connected Accounts</span>
            <div className="h-px flex-1 bb-divider border-t" />
          </div>
          <div className="bb-card bb-liquid rounded-2xl overflow-hidden">
            {oauthCreds.map((c) => {
              const app = APP_BY_PROVIDER[c.provider];
              return (
                <div key={c._id} className="group flex items-center gap-3.5 px-4 py-3 border-t bb-divider first:border-t-0 hover:bg-white/[0.025] transition-colors">
                  <img
                    src={app?.logo}
                    alt={app?.label || c.provider}
                    className="w-7 h-7 shrink-0 object-contain"
                    style={app?.invert ? { filter: 'brightness(0) invert(1)' } : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[var(--bb-text-hi)] truncate">{c.name}</p>
                    <p className="text-[10px] text-[var(--bb-text-dim)] mt-0.5">{app?.label || c.provider} · OAuth</p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color: 'var(--bb-accent-hot)', background: 'var(--bb-accent-soft)', border: '1px solid var(--bb-accent-ring)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--bb-accent)' }} /> Connected
                  </span>
                  <button onClick={() => handleDelete(c._id)} className="shrink-0 p-2 text-[var(--bb-text-dim)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100" title="Disconnect">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bb-divider border-t" />
        <span className="bb-eyebrow">API Keys &amp; Tokens</span>
        <div className="h-px flex-1 bb-divider border-t" />
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bb-card bb-liquid rounded-2xl mb-8 p-5" style={{ animation: 'dbFadeIn 0.15s ease-out' }}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="bb-eyebrow">Name</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. OpenAI Production"
                  className="bg-[var(--bb-surface-0)] border border-[var(--bb-border)] rounded-lg px-3 py-2 text-[13px] text-[var(--bb-text-hi)] focus:outline-none focus:border-[var(--bb-accent-ring)] transition-colors placeholder:text-[var(--bb-text-dim)]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="bb-eyebrow">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)}
                  className="bg-[var(--bb-surface-0)] border border-[var(--bb-border)] rounded-lg px-3 py-2 text-[13px] text-[var(--bb-text-hi)] focus:outline-none focus:border-[var(--bb-accent-ring)] transition-colors cursor-pointer appearance-none">
                  <option value="bearer">Bearer Token</option>
                  <option value="api_key">API Key</option>
                  <option value="basic">Basic Auth</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="bb-eyebrow">Secret</label>
              <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
                placeholder="sk-••••••••••••••••"
                className="bg-[var(--bb-surface-0)] border border-[var(--bb-border)] rounded-lg px-3 py-2 text-[13px] text-[var(--bb-text-hi)] font-mono focus:outline-none focus:border-[var(--bb-accent-ring)] transition-colors placeholder:text-[var(--bb-text-dim)]"
              />
            </div>
            {error && <p className="text-[12px] text-red-400 font-medium">{error}</p>}
            <div className="flex items-center gap-3 justify-end pt-2">
              <button type="button" onClick={() => { setShowForm(false); setError(null); }}
                className="px-4 py-2 text-[12px] font-semibold text-[var(--bb-text-lo)] hover:text-[var(--bb-text-hi)] transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isCreating}
                className="bb-btn bb-btn-accent flex items-center gap-2 h-9 px-5 text-[12px] disabled:opacity-50">
                {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                Encrypt &amp; Save
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Manual Credentials List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-[var(--bb-text-dim)]">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : credentials.filter(c => c.type !== 'oauth').length === 0 ? (
        <div className="bb-card bb-liquid rounded-2xl flex flex-col items-center justify-center py-12 text-center">
          <Key className="w-8 h-8 text-[var(--bb-text-dim)] mb-3" />
          <p className="text-[13px] text-[var(--bb-text-lo)] font-medium">No API keys stored yet.</p>
          <p className="text-[12px] text-[var(--bb-text-dim)] mt-1">Add API keys and tokens to use in your workflow nodes.</p>
        </div>
      ) : (
        <div className="bb-card bb-liquid rounded-2xl overflow-hidden">
          {credentials.filter(c => c.type !== 'oauth').map((cred) => (
            <div key={cred._id} className="flex flex-col group border-t bb-divider first:border-t-0">
              <div className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.025] transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--bb-surface-2)', border: '1px solid var(--bb-border)', color: 'var(--bb-text-lo)' }}>
                    <Key className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-semibold text-[var(--bb-text-hi)] truncate">{cred.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-semibold text-[var(--bb-text-dim)] uppercase tracking-wider">
                        {TYPE_LABELS[cred.type] || cred.type}
                      </span>
                      <span className="text-[10px] text-[var(--bb-text-dim)] font-mono select-all truncate max-w-[200px]">{cred._id}</span>
                      <button onClick={() => handleCopyId(cred._id)}
                        className="p-0.5 text-[var(--bb-text-dim)] hover:text-[var(--bb-text-mid)] transition-colors shrink-0" title="Copy credential ID">
                        {copiedId === cred._id
                          ? <CheckCheck className="w-3 h-3" style={{ color: 'var(--bb-accent)' }} />
                          : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { setEditingId(editingId === cred._id ? null : cred._id); setEditSecret(''); setEditError(null); }}
                    className="p-2 text-[var(--bb-text-dim)] hover:text-[var(--bb-text-mid)] transition-colors" title="Update secret">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(cred._id)}
                    className="p-2 text-[var(--bb-text-dim)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {editingId === cred._id && (
                <div className="px-4 pb-4 flex flex-col gap-2 border-t bb-divider pt-3">
                  <label className="bb-eyebrow">New Secret</label>
                  <div className="flex gap-2">
                    <input type="password" value={editSecret} onChange={(e) => setEditSecret(e.target.value)}
                      placeholder="Paste new token / API key"
                      className="flex-1 bg-[var(--bb-surface-0)] border border-[var(--bb-border)] rounded-lg px-3 py-2 text-[13px] text-[var(--bb-text-hi)] font-mono focus:outline-none focus:border-[var(--bb-accent-ring)] transition-colors placeholder:text-[var(--bb-text-dim)]"
                    />
                    <button onClick={() => handleUpdate(cred._id)} disabled={isUpdating}
                      className="bb-btn bb-btn-accent flex items-center gap-1.5 h-auto px-4 text-[12px] disabled:opacity-50">
                      {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                      Save
                    </button>
                  </div>
                  {editError && <p className="text-[12px] text-red-400 font-medium">{editError}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {credentials.filter(c => c.type !== 'oauth').length > 0 && (
        <p className="text-[10px] text-[var(--bb-text-dim)] mt-4 text-center">
          Click the copy icon next to a credential ID to use it in your workflow nodes.
        </p>
      )}
    </div>
  );
}
