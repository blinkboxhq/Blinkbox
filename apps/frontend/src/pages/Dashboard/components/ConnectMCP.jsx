import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Loader2, Copy, CheckCheck, KeyRound,
  ShieldCheck, ListChecks, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../lib/api';
import imgBlinkbox from '../../../assets/blinkbox-knot.png';
import imgCursor from '../../../assets/mcp-cursor.png';
import imgCodex from '../../../assets/mcp-codex.svg';
import imgClaude from '../../../assets/mcp-claude.webp';
import imgHermes from '../../../assets/mcp-hermes.svg';
import imgOpenClaw from '../../../assets/mcp-openclaw.svg';

const MCP_URL = 'https://mcp.blinkbox.net/mcp';

const TOOLS = [
  'list_automations', 'get_automation', 'run_automation', 'create_automation',
  'activate_automation', 'deactivate_automation', 'rename_automation', 'delete_automation',
  'list_executions', 'get_execution', 'get_execution_logs', 'list_credentials',
];

// Fanned hero cards — each tile keeps its own brand surface (real app-icon look).
// `bleed`: image already includes its own tile → fill edge-to-edge.
// otherwise render the mark on `bg` with `pad`.
const FAN = [
  { logo: imgCursor,   bleed: true,                rot: -24, x: -188, y: 30, z: 1 },
  { logo: imgOpenClaw, bg: '#0a0e1a', pad: 22,     rot: -15, x: -120, y: 12, z: 2 },
  { logo: imgClaude,   bleed: true,                rot: -7,  x: -58,  y: 2,  z: 3 },
  { logo: imgBlinkbox, bg: '#0a0a0a', pad: 14,     rot: 0,   x: 0,    y: -4, z: 5, hero: true },
  { logo: imgCodex,    bleed: true,                rot: 7,   x: 58,   y: 2,  z: 3 },
  { logo: imgHermes,   bg: '#111317', pad: 22, white: true, rot: 15, x: 120, y: 12, z: 2 },
];

const CONNECTORS = [
  { id: 'cursor',   name: 'Cursor',   logo: imgCursor,   bleed: true,  path: 'Settings → MCP → Add server' },
  { id: 'codex',    name: 'Codex',    logo: imgCodex,    bleed: true,  path: '~/.codex/config.toml → add MCP server' },
  { id: 'claude',   name: 'Claude',   logo: imgClaude,   bleed: true,  path: 'Settings → Connectors → Add custom connector' },
  { id: 'hermes',   name: 'Hermes',   logo: imgHermes,   white: true,  path: 'Add tool / MCP server (Bearer header)' },
  { id: 'openclaw', name: 'OpenClaw', logo: imgOpenClaw,               path: 'Tools / MCP → Add server' },
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
      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-[12px] font-semibold shrink-0 transition-all duration-150 ${
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
      const res = await api.post('/api/keys', { label: label.trim() || 'MCP connector' });
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
      {/* ── Hero: fanned app tiles + title ── */}
      <div className="relative flex flex-col items-center text-center pt-6 pb-10 mb-2 overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-[280px] pointer-events-none opacity-[0.6]"
          style={{ background: 'radial-gradient(ellipse 50% 70% at 50% 0%, rgba(111,151,232,0.10), transparent 70%)' }}
        />
        <div className="relative h-[150px] w-full flex items-center justify-center mb-7">
          {FAN.map((c, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                transform: `translateX(${c.x}px) translateY(${c.y}px) rotate(${c.rot}deg)`,
                zIndex: c.z,
              }}
            >
              <div
                className="rounded-[26px] overflow-hidden flex items-center justify-center shadow-[0_20px_45px_-12px_rgba(0,0,0,0.8)]"
                style={{
                  width: c.hero ? 116 : 100,
                  height: c.hero ? 116 : 100,
                  background: c.bg,
                  padding: c.bleed ? 0 : c.pad,
                  border: c.hero ? '2px solid rgba(111,151,232,0.55)' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: c.hero
                    ? '0 0 0 5px rgba(111,151,232,0.12), 0 24px 55px -12px rgba(0,0,0,0.85)'
                    : undefined,
                }}
              >
                <img
                  src={c.logo}
                  alt=""
                  className={`w-full h-full ${c.bleed ? 'object-cover' : 'object-contain'} ${c.white ? 'text-white' : ''}`}
                  style={c.white ? { filter: 'brightness(0) invert(1)' } : undefined}
                  draggable={false}
                />
              </div>
            </div>
          ))}
        </div>

        <h2 className="relative text-[34px] leading-none font-black text-white tracking-tight uppercase">
          Blinkbox MCP for any AI
        </h2>
        <p className="relative text-[14px] text-neutral-500 mt-3.5 max-w-[440px] leading-relaxed">
          Connect Blinkbox to your favorite AI chat and run, build, and manage your
          automations straight from your prompts.
        </p>
      </div>

      {/* ── The one thing they need: the URL ── */}
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0c0c0c] overflow-hidden mb-7 max-w-[680px] mx-auto">
        <div className="flex items-center gap-2 px-5 pt-4 pb-3">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Server URL</span>
          <span className="text-[9px] font-semibold text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-800">Streamable HTTP</span>
        </div>
        <div className="flex items-center gap-2 px-5 pb-5">
          <code className="flex-1 min-w-0 bg-black border border-[#1a1a1a] rounded-lg px-3.5 py-3 text-[13px] text-neutral-200 font-mono truncate">
            {MCP_URL}
          </code>
          <CopyBtn value={MCP_URL} label="server URL" primary />
        </div>
        <div className="px-5 pb-5 -mt-1">
          <p className="text-[12px] text-neutral-500 leading-relaxed flex items-start gap-2">
            <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-neutral-600" />
            In your AI app, add a custom MCP / connector, paste this URL, and authenticate
            with a key from below. That’s the whole setup.
          </p>
        </div>
      </div>

      {/* ── Where to paste it (per app) ── */}
      <div className="max-w-[680px] mx-auto mb-9">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-neutral-900" />
          <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Where to add it</span>
          <div className="h-px flex-1 bg-neutral-900" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {CONNECTORS.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]">
              <div
                className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                style={{ background: c.bleed ? undefined : (c.white ? '#111317' : '#0a0e1a'), border: c.bleed ? undefined : '1px solid rgba(255,255,255,0.06)' }}
              >
                <img
                  src={c.logo}
                  alt={c.name}
                  className={`w-full h-full ${c.bleed ? 'object-cover' : 'object-contain p-1'}`}
                  style={c.white ? { filter: 'brightness(0) invert(1)' } : undefined}
                />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-neutral-200">{c.name}</p>
                <p className="text-[11px] text-neutral-600 truncate">{c.path}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Auth key ── */}
      <div className="max-w-[680px] mx-auto">
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

        <form onSubmit={handleCreate} className="flex items-end gap-3 mb-9">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Key label</label>
            <input
              type="text" value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Claude connector"
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
    </div>
  );
}
