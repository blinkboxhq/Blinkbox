import { useState, useEffect, useCallback } from 'react';
import {
  Plug, Plus, Trash2, Loader2, Copy, CheckCheck, KeyRound,
  ShieldCheck, ListChecks, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import api, { API_URL } from '../../../lib/api';
import imgClaude from '../../../assets/claude.svg';
import imgChatGPT from '../../../assets/chatgpt.png';
import imgGrok from '../../../assets/grok-color.svg';
import imgHermes from '../../../assets/hermes.svg';
import imgOpenClaw from '../../../assets/openclaw.svg';
import imgManus from '../../../assets/manus.svg';

const TOOLS = [
  'list_automations', 'get_automation', 'run_automation', 'create_automation',
  'activate_automation', 'deactivate_automation', 'rename_automation', 'delete_automation',
  'list_executions', 'get_execution', 'get_execution_logs', 'list_credentials',
];

const CONNECTORS = [
  {
    id: 'claude', name: 'Claude', logo: imgClaude,
    blurb: 'Claude.ai web & desktop — custom connector (OAuth auto-approves).',
    steps: [
      'Open Claude → Settings → Connectors → Add custom connector.',
      'Paste the connector URL below into the URL field. Leave OAuth blank.',
      'Click Connect — Blinkbox auto-approves using the key in the URL. No login screen.',
      'In any chat, click the connector and ask “List my automations”.',
    ],
  },
  {
    id: 'chatgpt', name: 'ChatGPT', logo: imgChatGPT,
    blurb: 'ChatGPT (Plus/Pro/Team) — Settings → Connectors / custom MCP.',
    steps: [
      'ChatGPT → Settings → Connectors → Add → “Custom (MCP server)”.',
      'Paste the connector URL below. Transport: Streamable HTTP.',
      'Save. The key in the URL authenticates you — no extra auth needed.',
      'Start a chat with the connector enabled and ask it to run an automation.',
    ],
  },
  {
    id: 'grok', name: 'Grok', logo: imgGrok,
    blurb: 'Grok (x.ai) — Integrations → custom MCP server.',
    steps: [
      'Grok → Settings → Integrations / Connections → Add MCP server.',
      'Paste the connector URL below as the server endpoint.',
      'Save and enable it for your conversation.',
      'Ask “Show my Blinkbox workflows”.',
    ],
  },
  {
    id: 'hermes', name: 'Hermes', logo: imgHermes,
    blurb: 'Nous Hermes / OpenAI-compatible clients — MCP via Bearer header.',
    steps: [
      'In your Hermes client, add a tool/MCP server.',
      'Endpoint: the base MCP URL (without the key in the path).',
      'Set header  Authorization: Bearer <your-key>.',
      'Reload tools — the 12 Blinkbox actions appear.',
    ],
  },
  {
    id: 'openclaw', name: 'OpenClaw', logo: imgOpenClaw,
    blurb: 'OpenClaw agent — add Blinkbox as a Streamable-HTTP MCP source.',
    steps: [
      'OpenClaw → Tools / MCP → Add server.',
      'Paste the connector URL below (key in path) or use the Bearer header.',
      'Confirm the handshake succeeds (status: connected).',
      'Reference the tools in your agent prompt or run them directly.',
    ],
  },
  {
    id: 'manus', name: 'Manus', logo: imgManus,
    blurb: 'Manus — connect Blinkbox as an external MCP toolset.',
    steps: [
      'Manus → Settings → Integrations → Add MCP server.',
      'Paste the connector URL below. Transport: Streamable HTTP.',
      'Save — the key authenticates automatically.',
      'Ask Manus to “create an automation that …”.',
    ],
  },
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

function CopyBtn({ value, label, primary }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold shrink-0 transition-all duration-150 ${
        primary
          ? 'bg-white text-black hover:bg-neutral-200'
          : 'border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-500 hover:bg-white/[0.03]'
      }`}
      title={`Copy ${label}`}
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
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
  const [active, setActive] = useState('claude');

  const mcpUrl = `${API_URL}/api/mcp`;
  const keyForUrl = freshKey?.key || '<your-key>';
  const connectorUrl = `${mcpUrl}/${keyForUrl}`;
  const connector = CONNECTORS.find((c) => c.id === active);

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
      const res = await api.post('/api/keys', { label: label.trim() || `${connector.name} connector` });
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

  return (
    <div style={{ animation: 'dbFadeIn 0.2s ease-out' }}>
      {/* Header */}
      <div className="flex items-start gap-3.5 mb-9">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-neutral-800 flex items-center justify-center shrink-0">
          <Plug className="w-5 h-5 text-neutral-200" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-neutral-100 tracking-tight">Connect to Chat</h2>
          <p className="text-sm text-neutral-500 mt-1 max-w-[600px] leading-relaxed">
            Drive your Blinkbox automations from any AI chat. Pick your app, mint a key, paste one URL — it just works.
          </p>
        </div>
      </div>

      {/* Connector picker — colorful real logos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-7">
        {CONNECTORS.map((c) => {
          const isActive = c.id === active;
          return (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`group flex flex-col items-center gap-2.5 py-4 rounded-2xl border transition-all duration-150 ${
                isActive
                  ? 'border-neutral-500 bg-white/[0.05]'
                  : 'border-[#1a1a1a] bg-[#0c0c0c] hover:border-neutral-700 hover:bg-white/[0.02]'
              }`}
            >
              <img
                src={c.logo} alt={c.name}
                className={`w-8 h-8 object-contain transition-all duration-150 ${isActive ? '' : 'opacity-80 group-hover:opacity-100'}`}
              />
              <span className={`text-[12px] font-semibold transition-colors ${isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}`}>
                {c.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Per-connector setup guide */}
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0c0c0c] overflow-hidden mb-7">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#161616]">
          <img src={connector.logo} alt={connector.name} className="w-7 h-7 object-contain shrink-0" />
          <div className="min-w-0">
            <h3 className="text-[14px] font-bold text-neutral-100">Set up {connector.name}</h3>
            <p className="text-[11px] text-neutral-500 truncate">{connector.blurb}</p>
          </div>
        </div>

        <div className="p-5">
          <ol className="flex flex-col gap-3 mb-5">
            {connector.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 mt-px rounded-full bg-white/[0.06] border border-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-300 shrink-0">
                  {i + 1}
                </span>
                <span className="text-[13px] text-neutral-300 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          {/* Connector URL — the one thing to copy */}
          <div className="rounded-xl border border-[#1a1a1a] bg-black p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Connector URL</span>
              <span className="text-[9px] font-semibold text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-800">Streamable HTTP</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 text-[12px] text-neutral-300 font-mono truncate">{connectorUrl}</code>
              <CopyBtn value={connectorUrl} label="connector URL" primary />
            </div>
          </div>
          {!freshKey && (
            <p className="text-[11px] text-neutral-600 mt-2.5 leading-relaxed flex items-center gap-1.5">
              <ArrowRight className="w-3 h-3 shrink-0" />
              Mint a key below to fill in <span className="font-mono text-neutral-500">&lt;your-key&gt;</span> automatically.
            </p>
          )}
        </div>
      </div>

      {/* Fresh key — shown once */}
      {freshKey && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-5 mb-7" style={{ animation: 'dbFadeIn 0.2s ease-out' }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">New key — copy it now, it won’t be shown again</span>
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
      <form onSubmit={handleCreate} className="flex items-end gap-3 mb-9">
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Key label</label>
          <input
            type="text" value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder={`e.g. ${connector.name} connector`}
            className="bg-black border border-neutral-800 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-neutral-600 transition-colors placeholder-neutral-700"
          />
        </div>
        <button type="submit" disabled={isCreating}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-xs font-bold rounded-lg hover:bg-neutral-200 transition-all duration-150 disabled:opacity-50 shrink-0">
          {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Mint Key
        </button>
      </form>

      {/* Existing keys */}
      <div className="mb-9">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-neutral-900" />
          <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Active Keys</span>
          <div className="h-px flex-1 bg-neutral-900" />
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
                <div key={id} className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-neutral-900 rounded-xl group hover:border-neutral-700 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.03] border border-neutral-800 flex items-center justify-center text-neutral-300 shrink-0">
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
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0c0c0c] p-5">
        <div className="flex items-center gap-2 mb-3.5">
          <ListChecks className="w-3.5 h-3.5 text-neutral-400" />
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
