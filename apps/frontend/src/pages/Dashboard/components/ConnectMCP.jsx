import { useState, useEffect, useCallback } from 'react';
import { Trash2, Loader2, Copy, CheckCheck, KeyRound, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../lib/api';
import imgBlinkbox from '../../../assets/blinkbox-knot.png';
import imgCursor from '../../../assets/mcp-cursor.png';
import imgCodex from '../../../assets/mcp-codex.svg';
import imgClaude from '../../../assets/mcp-claude.webp';
import imgHermes from '../../../assets/mcp-hermes.svg';
import imgOpenClaw from '../../../assets/mcp-openclaw.svg';
import imgManus from '../../../assets/mcp-manus.webp';

const MCP_URL = 'https://mcp.blinkbox.net/mcp';

const TOOLS = [
  'list_automations', 'get_automation', 'run_automation', 'create_automation',
  'activate_automation', 'deactivate_automation', 'rename_automation', 'delete_automation',
  'list_executions', 'get_execution', 'get_execution_logs', 'list_credentials',
];

// Tightly-overlapping arc of app tiles, Blinkbox highlighted in the centre.
// `bleed` → image already has its own tile, fill edge-to-edge.
// otherwise the mark sits on `bg` with `pad`; `white` inverts a mono mark.
const FAN = [
  { logo: imgCursor,   bleed: true },
  { logo: imgClaude,   bleed: true },
  { logo: imgCodex,    bleed: true },
  { logo: imgBlinkbox, bg: '#0a0a0a', pad: 14, hero: true },
  { logo: imgHermes,   bg: '#1b1d22', pad: 22, white: true },
  { logo: imgOpenClaw, bg: '#ffffff', pad: 18 },
  { logo: imgManus,    bleed: true },
];

const CONNECTORS = [
  { id: 'cursor',   name: 'Cursor',   logo: imgCursor,   bleed: true, path: 'Settings → MCP → Add server' },
  { id: 'codex',    name: 'Codex',    logo: imgCodex,    bleed: true, path: '~/.codex/config.toml → add MCP server' },
  { id: 'claude',   name: 'Claude',   logo: imgClaude,   bleed: true, path: 'Settings → Connectors → Add custom connector' },
  { id: 'hermes',   name: 'Hermes',   logo: imgHermes,   white: true, path: 'Add tool / MCP server (Bearer header)' },
  { id: 'openclaw', name: 'OpenClaw', logo: imgOpenClaw, light: true, path: 'Tools / MCP → Add server' },
  { id: 'manus',    name: 'Manus',    logo: imgManus,    bleed: true, path: 'Settings → Integrations → Add MCP server' },
];

// Arc geometry — tiles overlap (small step), curve down toward the edges.
const N = FAN.length;
const MID = (N - 1) / 2;
const STEP_X = 78;   // horizontal spacing (tiles overlap since tile ≈ 100px)
const ARC_Y = 7;     // vertical drop per step away from centre
const ROT = 7;       // degrees of fan rotation per step

function timeAgo(d) {
  if (!d) return 'never';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

function Tile({ c, hero }) {
  return (
    <div
      className="rounded-[24px] overflow-hidden flex items-center justify-center"
      style={{
        width: hero ? 120 : 100,
        height: hero ? 120 : 100,
        background: c.bg,
        padding: c.bleed ? 0 : c.pad,
        border: hero ? '2px solid rgba(190,242,80,0.65)' : '1px solid rgba(255,255,255,0.10)',
        boxShadow: hero
          ? '0 0 0 5px rgba(190,242,80,0.10), 0 28px 60px -14px rgba(0,0,0,0.9)'
          : '0 22px 48px -16px rgba(0,0,0,0.85)',
      }}
    >
      <img
        src={c.logo}
        alt=""
        className={`w-full h-full ${c.bleed ? 'object-cover' : 'object-contain'}`}
        style={c.white ? { filter: 'brightness(0) invert(1)' } : undefined}
        draggable={false}
      />
    </div>
  );
}

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className="flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] font-semibold shrink-0 transition-all duration-150 bg-white text-black hover:bg-neutral-200"
    >
      {copied ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copied' : 'Copy URL'}
    </button>
  );
}

export default function ConnectMCP() {
  const [keys, setKeys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
    <div style={{ animation: 'dbFadeIn 0.2s ease-out' }} className="max-w-[760px] mx-auto">
      {/* ── Hero: overlapping arc of app tiles ── */}
      <div className="relative flex flex-col items-center text-center pt-4 pb-9 overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-[260px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 75% at 50% 0%, rgba(190,242,80,0.07), transparent 70%)' }}
        />
        <div className="relative h-[150px] w-full flex items-center justify-center mb-8">
          {FAN.map((c, i) => {
            const off = i - MID;
            return (
              <div
                key={i}
                className="absolute"
                style={{
                  transform: `translateX(${off * STEP_X}px) translateY(${Math.abs(off) * ARC_Y - (c.hero ? 6 : 0)}px) rotate(${off * ROT}deg)`,
                  zIndex: c.hero ? 50 : 10 - Math.abs(off),
                }}
              >
                <Tile c={c} hero={c.hero} />
              </div>
            );
          })}
        </div>

        <h2 className="relative text-[32px] leading-none font-black text-white tracking-tight uppercase">
          Blinkbox MCP for any AI
        </h2>
        <p className="relative text-[14px] text-neutral-500 mt-3.5 max-w-[440px] leading-relaxed">
          Connect Blinkbox to your favorite AI chat and run, build, and manage your
          automations straight from your prompts.
        </p>
      </div>

      {/* ── Big liquid-glass MCP URL panel with reflective border ── */}
      <div className="relative rounded-3xl p-[1.5px] mb-9 overflow-hidden">
        {/* reflective gradient border */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.35), rgba(255,255,255,0.04) 35%, rgba(255,255,255,0.02) 65%, rgba(190,242,80,0.30))' }}
        />
        <div
          className="relative rounded-[22px] px-7 py-7 backdrop-blur-2xl overflow-hidden"
          style={{ background: 'linear-gradient(160deg, rgba(28,28,32,0.85), rgba(12,12,14,0.92))' }}
        >
          {/* top sheen */}
          <div
            className="absolute -top-px left-6 right-6 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)' }}
          />
          {/* glossy highlight blob */}
          <div
            className="absolute -top-16 -left-10 w-72 h-40 pointer-events-none opacity-60"
            style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.10), transparent 70%)' }}
          />

          <div className="relative flex items-center gap-2.5 mb-4">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.18em]">MCP Server URL</span>
            <span className="text-[9px] font-semibold text-neutral-500 px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03]">Streamable HTTP</span>
          </div>

          <div className="relative flex items-center gap-3">
            <code className="flex-1 min-w-0 rounded-xl px-4 py-3.5 text-[14px] text-white font-mono truncate bg-black/40 border border-white/10">
              {MCP_URL}
            </code>
            <CopyBtn value={MCP_URL} />
          </div>

          <p className="relative text-[12px] text-neutral-500 mt-4 leading-relaxed">
            In your AI app, add a custom MCP / connector, paste this URL, and authenticate with a key below.
            That’s the entire setup — no extra config.
          </p>
        </div>
      </div>

      {/* ── Where to add it (per app) ── */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-neutral-900" />
          <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Where to add it</span>
          <div className="h-px flex-1 bg-neutral-900" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {CONNECTORS.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]">
              <div
                className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                style={{ background: c.bleed ? undefined : (c.white ? '#1b1d22' : '#ffffff'), border: c.bleed ? undefined : '1px solid rgba(255,255,255,0.08)' }}
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

      {/* ── What chat can do ── */}
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0c0c0c] p-5 mb-10">
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

      {/* ── Keys (bottom, list only) ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-neutral-900" />
          <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Your Keys</span>
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
            <p className="text-[12px] text-neutral-600 mt-1">Create one in Credentials to authenticate your chatbot.</p>
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
    </div>
  );
}
