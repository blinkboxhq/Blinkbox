import { useState, useEffect, useCallback, useRef } from 'react';
import { Key, Plus, Trash2, Shield, Loader2, Copy, CheckCheck, Pencil, Link2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TYPE_LABELS = {
  bearer: 'Bearer Token',
  api_key: 'API Key',
  basic: 'Basic Auth',
  oauth: 'OAuth',
};

const OAUTH_APPS = [
  { provider: 'google',    label: 'Google',    desc: 'Gmail, Sheets, Drive, Calendar, YouTube', color: '#4285F4', bgColor: '#4285F41a' },
  { provider: 'slack',     label: 'Slack',     desc: 'Post messages, manage channels',           color: '#E01E5A', bgColor: '#E01E5A1a' },
  { provider: 'github',    label: 'GitHub',    desc: 'Issues, PRs, repos, webhooks',             color: '#e8eaea', bgColor: '#ffffff1a' },
  { provider: 'notion',    label: 'Notion',    desc: 'Pages, databases, content',                color: '#e8eaea', bgColor: '#ffffff1a' },
  { provider: 'airtable',  label: 'Airtable',  desc: 'Bases, tables, records',                   color: '#F82B60', bgColor: '#F82B601a' },
  { provider: 'microsoft', label: 'Microsoft', desc: 'Teams, Outlook, OneDrive',                 color: '#0078D4', bgColor: '#0078D41a' },
];

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
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-neutral-100 tracking-tight">Credentials Vault</h2>
          <p className="text-sm text-neutral-500 mt-1">AES-256-GCM encrypted. Secrets never leave the server.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Add Credential
        </button>
      </div>

      {/* OAuth Connected Apps */}
      <div className="mb-8">
        <button
          onClick={() => setShowOAuth(v => !v)}
          className="flex items-center gap-2 w-full mb-3 group"
        >
          <Link2 className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Connected Apps (OAuth)</span>
          {connectedProviders.size > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">{connectedProviders.size}</span>
          )}
          <div className="ml-auto">
            {showOAuth ? <ChevronUp className="w-3.5 h-3.5 text-neutral-600" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-600" />}
          </div>
        </button>

        {showOAuth && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {OAUTH_APPS.map(app => {
              const connected = connectedProviders.has(app.provider);
              const isConnecting = connectingProvider === app.provider;
              const appCreds = oauthCreds.filter(c => c.provider === app.provider);
              return (
                <div key={app.provider}
                  className="flex flex-col gap-2 p-3.5 rounded-xl border transition-all"
                  style={{
                    borderColor: connected ? app.color + '30' : '#27272a',
                    background: connected ? app.bgColor : 'transparent',
                  }}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[12px] font-bold text-neutral-200">{app.label}</p>
                      <p className="text-[9px] text-neutral-600 mt-0.5 leading-tight">{app.desc}</p>
                    </div>
                    {connected && <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: app.color }} />}
                  </div>
                  <button
                    onClick={() => connectOAuth(app.provider)}
                    disabled={isConnecting}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all disabled:opacity-60"
                    style={{
                      color: app.color,
                      borderColor: app.color + '40',
                      backgroundColor: app.color + '0d',
                    }}
                  >
                    {isConnecting
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Link2 className="w-3 h-3" />
                    }
                    {connected ? 'Add another' : 'Connect'}
                  </button>

                  {appCreds.length > 0 && (
                    <div className="flex flex-col gap-1 mt-1">
                      {appCreds.map(c => (
                        <div key={c._id} className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-[10px] text-neutral-400 truncate flex-1">{c.name}</span>
                          <button onClick={() => handleDelete(c._id)} className="text-neutral-700 hover:text-red-400 transition-colors shrink-0">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-neutral-800" />
        <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">API Keys & Tokens</span>
        <div className="h-px flex-1 bg-neutral-800" />
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 p-5 bg-neutral-950 border border-neutral-800 rounded-xl animate-slide-up">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Name</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. OpenAI Production"
                  className="bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600 transition-colors placeholder-neutral-700"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)}
                  className="bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600 transition-colors cursor-pointer appearance-none">
                  <option value="bearer">Bearer Token</option>
                  <option value="api_key">API Key</option>
                  <option value="basic">Basic Auth</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Secret</label>
              <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
                placeholder="sk-••••••••••••••••"
                className="bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-neutral-600 transition-colors placeholder-neutral-700"
              />
            </div>
            {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
            <div className="flex items-center gap-3 justify-end pt-2">
              <button type="button" onClick={() => { setShowForm(false); setError(null); }}
                className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:text-white transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isCreating}
                className="flex items-center gap-2 px-5 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-neutral-200 transition-all disabled:opacity-50">
                {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                Encrypt & Save
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Manual Credentials List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-neutral-600">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : credentials.filter(c => c.type !== 'oauth').length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-neutral-800 rounded-xl text-center">
          <Key className="w-8 h-8 text-neutral-700 mb-3" />
          <p className="text-sm text-neutral-500 font-medium">No API keys stored yet.</p>
          <p className="text-xs text-neutral-600 mt-1">Add API keys and tokens to use in your workflow nodes.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {credentials.filter(c => c.type !== 'oauth').map((cred) => (
            <div key={cred._id} className="flex flex-col bg-neutral-950 border border-neutral-800 rounded-xl group hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500">
                    <Key className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-neutral-200">{cred.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                        {TYPE_LABELS[cred.type] || cred.type}
                      </span>
                      <span className="text-[10px] text-neutral-600 font-mono select-all">{cred._id}</span>
                      <button onClick={() => handleCopyId(cred._id)}
                        className="p-0.5 text-neutral-600 hover:text-neutral-300 transition-colors" title="Copy credential ID">
                        {copiedId === cred._id
                          ? <CheckCheck className="w-3 h-3 text-emerald-400" />
                          : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditingId(editingId === cred._id ? null : cred._id); setEditSecret(''); setEditError(null); }}
                    className="p-2 text-neutral-600 hover:text-neutral-300 transition-colors" title="Update secret">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(cred._id)}
                    className="p-2 text-neutral-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {editingId === cred._id && (
                <div className="px-4 pb-4 flex flex-col gap-2 border-t border-neutral-800 pt-3">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">New Secret</label>
                  <div className="flex gap-2">
                    <input type="password" value={editSecret} onChange={(e) => setEditSecret(e.target.value)}
                      placeholder="Paste new token / API key"
                      className="flex-1 bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-neutral-600 transition-colors placeholder-neutral-700"
                    />
                    <button onClick={() => handleUpdate(cred._id)} disabled={isUpdating}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-neutral-200 transition-all disabled:opacity-50">
                      {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                      Save
                    </button>
                  </div>
                  {editError && <p className="text-xs text-red-400 font-medium">{editError}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {credentials.filter(c => c.type !== 'oauth').length > 0 && (
        <p className="text-[10px] text-neutral-600 mt-4 text-center">
          Click the copy icon next to a credential ID to use it in your workflow nodes.
        </p>
      )}
    </div>
  );
}
