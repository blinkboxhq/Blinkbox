import { useState, useEffect, useCallback } from 'react';
import { Trash2, Loader2, Copy, CheckCheck, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../lib/api';
import imgBlinkbox from '../../../assets/blinkbox-knot.png';
import imgCursor from '../../../assets/mcp-cursor.png';
import imgCodex from '../../../assets/mcp-codex.svg';
import imgClaude from '../../../assets/mcp-claude.webp';
import imgHermes from '../../../assets/mcp-hermes.webp';
import imgOpenClaw from '../../../assets/mcp-openclaw.svg';
import imgManus from '../../../assets/mcp-manus.webp';

const MCP_URL = 'https://mcp.blinkbox.net/mcp';

// Tightly-overlapping arc of app tiles, Blinkbox highlighted in the centre.
// `bleed` → image already has its own tile, fill edge-to-edge.
// otherwise the mark sits on `bg` with `pad`.
const FAN = [
  { logo: imgCursor,   bleed: true },
  { logo: imgClaude,   bleed: true },
  { logo: imgCodex,    bleed: true },
  { logo: imgBlinkbox, bg: '#0a0a0a', pad: 14, hero: true },
  { logo: imgHermes,   bleed: true },
  { logo: imgOpenClaw, bg: '#ffffff', pad: 18 },
  { logo: imgManus,    bleed: true },
];

const N = FAN.length;
const MID = (N - 1) / 2;
const STEP_X = 78;
const ARC_Y = 7;
const ROT = 7;

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
        width: hero ? 122 : 100,
        height: hero ? 122 : 100,
        background: c.bg,
        padding: c.bleed ? 0 : c.pad,
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: hero
          ? '0 2px 0 0 rgba(255,255,255,0.12) inset, 0 34px 70px -14px rgba(0,0,0,0.95), 0 12px 28px -10px rgba(0,0,0,0.8)'
          : '0 1px 0 0 rgba(255,255,255,0.10) inset, 0 26px 54px -16px rgba(0,0,0,0.9), 0 8px 20px -8px rgba(0,0,0,0.7)',
      }}
    >
      <img
        src={c.logo}
        alt=""
        className={`w-full h-full ${c.bleed ? 'object-cover' : 'object-contain'}`}
        style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.45))' }}
        draggable={false}
      />
    </div>
  );
}

function CopyBtn({ value, label = 'Copy URL' }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className="flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] font-semibold shrink-0 transition-all duration-150 bg-white text-black hover:bg-neutral-200"
      style={{ boxShadow: '0 8px 24px -8px rgba(255,255,255,0.25)' }}
    >
      {copied ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

// Reflective gradient border + liquid-glass surface. Matches the Analytics panels.
function GlassPanel({ children, className = '' }) {
  return (
    <div className="relative rounded-3xl p-[1.5px] overflow-hidden">
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.40), rgba(255,255,255,0.05) 38%, rgba(255,255,255,0.02) 64%, rgba(255,255,255,0.26))' }}
      />
      <div
        className={`relative rounded-[22px] backdrop-blur-2xl overflow-hidden ${className}`}
        style={{
          background: 'linear-gradient(160deg, rgba(26,26,30,0.88), rgba(12,12,14,0.94))',
          boxShadow: '0 26px 70px -28px rgba(0,0,0,0.9)',
        }}
      >
        <div
          className="absolute -top-px left-6 right-6 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}
        />
        {children}
      </div>
    </div>
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
      <div className="relative flex flex-col items-center text-center pt-4 pb-9">
        <div
          className="absolute inset-x-0 top-0 h-[260px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 75% at 50% 0%, rgba(255,255,255,0.06), transparent 70%)' }}
        />
        <div className="relative h-[160px] w-full flex items-center justify-center mb-8">
          {FAN.map((c, i) => {
            const off = i - MID;
            return (
              <div
                key={i}
                className="absolute"
                style={{
                  transform: `translateX(${off * STEP_X}px) translateY(${Math.abs(off) * ARC_Y - (c.hero ? 8 : 0)}px) rotate(${off * ROT}deg)`,
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

      {/* ── Big liquid-glass MCP URL panel ── */}
      <GlassPanel className="px-7 py-7 mb-7">
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
          In your AI app, add a custom MCP / connector, paste this URL, and authenticate with one of
          your API keys. That’s the entire setup — no extra config.
        </p>
      </GlassPanel>

      {/* ── MCP Keys (Credentials-style list) ── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-neutral-900" />
        <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">MCP Keys</span>
        <div className="h-px flex-1 bg-neutral-900" />
      </div>

      {isLoading ? (
        <GlassPanel className="flex items-center justify-center py-16 text-[var(--bb-text-dim)]">
          <Loader2 className="w-5 h-5 animate-spin" />
        </GlassPanel>
      ) : keys.length === 0 ? (
        <GlassPanel className="flex flex-col items-center justify-center py-12 text-center">
          <KeyRound className="w-8 h-8 text-[var(--bb-text-dim)] mb-3" />
          <p className="text-[13px] text-[var(--bb-text-lo)] font-medium">No MCP keys yet.</p>
          <p className="text-[12px] text-[var(--bb-text-dim)] mt-1">Create one in Credentials to authenticate your AI chat.</p>
        </GlassPanel>
      ) : (
        <GlassPanel>
          {keys.map((k, i) => {
            const id = k.id || k._id;
            return (
              <div
                key={id}
                className={`group flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors ${i > 0 ? 'border-t border-white/[0.06]' : ''}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-neutral-300"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 1px 0 0 rgba(255,255,255,0.08) inset, 0 8px 18px -8px rgba(0,0,0,0.7)' }}
                  >
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-semibold text-neutral-100 truncate">{k.label}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-neutral-500 font-mono">{k.prefix}••••</span>
                      <span className="text-neutral-700">·</span>
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
        </GlassPanel>
      )}
    </div>
  );
}
