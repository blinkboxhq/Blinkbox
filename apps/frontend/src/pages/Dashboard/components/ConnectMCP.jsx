import { useState, useEffect, useCallback } from 'react';
import {
  Plug, Plus, Trash2, Loader2, Copy, CheckCheck, KeyRound,
  ShieldCheck, MessageSquare, ListChecks,
} from 'lucide-react';
import { toast } from 'sonner';
import api, { API_URL } from '../../../lib/api';

const TOOLS = [
  'list_automations', 'get_automation', 'run_automation', 'create_automation',
  'activate_automation', 'deactivate_automation', 'rename_automation', 'delete_automation',
  'list_executions', 'get_execution', 'get_execution_logs', 'list_credentials',
];

function timeAgo(d) {
  if (!d) return 'never';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

function CopyBtn({ value, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-[11px] font-medium text-neutral-400 hover:text-white hover:border-neutral-600 transition-all shrink-0"
      title={`Copy ${label}`}
    >
      {copied ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function ConnectMCP() {
  const [keys, setKeys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [freshKey, setFreshKey] = useState(null);

  const mcpUrl = `${API_URL}/api/mcp`;

  const fetchKeys = useCallback(async () => {
    try {
      const res = await api.get('/api/keys');
      setKeys(res.data.keys || []);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await api.post('/api/keys', { label: label.trim() || 'Chatbot connector' });
      setFreshKey(res.data);
      setLabel('');
      fetchKeys();
    } catch {
      toast.error('Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id) => {
    try {
      await api.delete(`/api/keys/${id}`);
      setKeys(keys.filter((k) => k.id !== id && k._id !== id));
      toast.success('Key revoked');
    } catch {
      toast.error('Failed to revoke key');
    }
  };

  const connectorUrl = freshKey ? `${mcpUrl}/${freshKey.key}` : `${mcpUrl}/<your-key>`;

  return (
    <div style={{ animation: 'dbFadeIn 0.2s ease-out' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Plug className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-100 tracking-tight">Connect to Chat</h2>
            <p className="text-sm text-neutral-500 mt-1 max-w-[560px]">
              Control your Blinkbox automations from ChatGPT, Claude, or any MCP-capable chatbot. Mint a key, paste the URL as a custom connector — done.
            </p>
          </div>
        </div>
      </div>

      {/* Setup guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-8">
        {[
          { n: 1, icon: KeyRound, title: 'Mint an API key', body: 'Create a key below. It’s shown once — copy it somewhere safe.' },
          { n: 2, icon: Plug, title: 'Add the connector', body: 'In your chatbot’s connector settings, paste the MCP URL with your key.' },
          { n: 3, icon: MessageSquare, title: 'Just ask', body: '“List my workflows”, “Run the daily report”, “Activate onboarding”.' },
        ].map((s) => (
          <div key={s.n} className="rounded-2xl border border-[#161616] bg-[#0c0c0c] p-4">
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="w-6 h-6 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-[11px] font-bold text-violet-400 shrink-0">{s.n}</span>
              <s.icon className="w-4 h-4 text-neutral-500" />
              <h3 className="text-[13px] font-semibold text-neutral-200">{s.title}</h3>
            </div>
            <p className="text-[12px] text-neutral-500 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>

      {/* Connector URL */}
      <div className="rounded-2xl border border-[#161616] bg-[#0c0c0c] p-5 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Plug className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">MCP Connector URL</span>
          <span className="text-[10px] font-medium text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-800">Streamable HTTP</span>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 bg-black border border-neutral-800 rounded-lg px-3 py-2.5 text-[12px] text-neutral-300 font-mono truncate">
            {connectorUrl}
          </code>
          <CopyBtn value={connectorUrl} label="connector URL" />
        </div>
        <p className="text-[11px] text-neutral-600 mt-2.5 leading-relaxed">
          Replace <span className="font-mono text-neutral-500">&lt;your-key&gt;</span> with the key you mint below, or send the key in an{' '}
          <span className="font-mono text-neutral-500">Authorization: Bearer</span> header against <span className="font-mono text-neutral-500">{mcpUrl}</span>.
        </p>
      </div>

      {/* Fresh key — shown once */}
      {freshKey && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 mb-8" style={{ animation: 'dbFadeIn 0.2s ease-out' }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Your new key — copy it now, it won’t be shown again</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 bg-black border border-emerald-500/20 rounded-lg px-3 py-2.5 text-[12px] text-emerald-300 font-mono truncate">
              {freshKey.key}
            </code>
            <CopyBtn value={freshKey.key} label="API key" />
          </div>
        </div>
      )}

      {/* Mint key form */}
      <form onSubmit={handleCreate} className="flex items-end gap-3 mb-8">
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Key label</label>
          <input
            type="text" value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Claude Desktop, ChatGPT"
            className="bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600 transition-colors placeholder-neutral-700"
          />
        </div>
        <button type="submit" disabled={isCreating}
          className="flex items-center gap-2 px-5 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-neutral-200 transition-all disabled:opacity-50 shrink-0">
          {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Mint Key
        </button>
      </form>

      {/* Existing keys */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-neutral-800" />
          <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Active Keys</span>
          <div className="h-px flex-1 bg-neutral-800" />
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-neutral-600">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 border border-dashed border-neutral-800 rounded-xl text-center">
            <KeyRound className="w-7 h-7 text-neutral-700 mb-2.5" />
            <p className="text-[13px] text-neutral-500 font-medium">No keys yet.</p>
            <p className="text-[12px] text-neutral-600 mt-1">Mint one above to connect your first chatbot.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {keys.map((k) => {
              const id = k.id || k._id;
              return (
                <div key={id} className="flex items-center justify-between p-4 bg-neutral-950 border border-neutral-800 rounded-xl group hover:border-neutral-700 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-violet-400 shrink-0">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-semibold text-neutral-200 truncate">{k.label}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-neutral-600 font-mono">{k.prefix}••••</span>
                        <span className="text-neutral-800">·</span>
                        <span className="text-[11px] text-neutral-600">used {timeAgo(k.lastUsedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleRevoke(id)}
                    className="p-2 text-neutral-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100" title="Revoke key">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available tools */}
      <div className="rounded-2xl border border-[#161616] bg-[#0c0c0c] p-5">
        <div className="flex items-center gap-2 mb-3.5">
          <ListChecks className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">What chat can do</span>
          <span className="text-[10px] font-medium text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-800">{TOOLS.length} tools</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TOOLS.map((t) => (
            <span key={t} className="text-[11px] font-mono text-neutral-400 bg-black border border-neutral-800 px-2.5 py-1 rounded-md">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
