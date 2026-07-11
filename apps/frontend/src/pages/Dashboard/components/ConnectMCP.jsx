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
const STEP_X = 96;
const ARC_Y = 5;
const ROT = 6;

function timeAgo(d) {
  if (!d) return 'never';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

function Tile({ c, hero, flat = false }) {
  return (
    <div
      className="rounded-[24px] overflow-hidden flex items-center justify-center"
      style={{
        width: hero ? 124 : 102,
        height: hero ? 124 : 102,
        background: c.bg,
        padding: c.bleed ? 0 : c.pad,
        border: '1px solid var(--bb-border)',
        boxShadow: flat
          ? 'none'
          : hero
            ? '0 2px 0 0 rgba(255,255,255,0.12) inset, 0 34px 70px -14px rgba(0,0,0,0.95), 0 12px 28px -10px rgba(0,0,0,0.8)'
            : '0 1px 0 0 rgba(255,255,255,0.08) inset, 0 26px 54px -16px rgba(0,0,0,0.9), 0 8px 20px -8px rgba(0,0,0,0.7)',
      }}
    >
      <img
        src={c.logo}
        alt=""
        className={`w-full h-full ${c.bleed ? 'object-cover' : 'object-contain'}`}
        style={{ filter: flat ? 'none' : 'drop-shadow(0 6px 12px rgba(0,0,0,0.45))' }}
        draggable={false}
      />
    </div>
  );
}

// The arc itself — rendered once for real, once flipped for the mirror floor.
function Fan({ flat = false }) {
  return (
    <>
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
            <Tile c={c} hero={c.hero} flat={flat} />
          </div>
        );
      })}
    </>
  );
}

function CopyBtn({ value, label = 'Copy URL' }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className="bb-btn bb-btn-primary flex items-center gap-2 px-4 py-3 text-[13px] shrink-0"
    >
      {copied ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copied' : label}
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

  useEffect(() => {
    const onFocus = () => fetchKeys();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchKeys]);

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
    <div style={{ animation: 'dbFadeIn 0.2s ease-out' }} className="max-w-[860px] mx-auto">
      {/* ── Hero: a pedestal of glass — wide arc grounded on a mirror floor,
           a light shaft rising behind the Blinkbox hero tile ── */}
      <div className="relative flex flex-col items-center text-center pt-6 pb-9">
        {/* ambient top glow */}
        <div
          className="absolute inset-x-0 top-0 h-[280px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(255,255,255,0.05), transparent 70%)' }}
        />
        {/* vertical light shaft behind the centre tile */}
        <div className="bb-shaft absolute left-1/2 -translate-x-1/2 top-2 w-[180px] h-[230px] pointer-events-none" />

        <div className="relative w-full flex flex-col items-center mb-8">
          {/* real fan */}
          <div className="relative h-[164px] w-full flex items-center justify-center">
            <Fan />
          </div>
          {/* reflected fan on the mirror floor */}
          <div className="bb-mirror relative h-[150px] w-full flex items-center justify-center -mt-[150px]" aria-hidden>
            <Fan flat />
          </div>
          {/* grounding line where tiles meet the floor */}
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-[148px] w-[640px] max-w-[88%] h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22) 50%, transparent)' }}
          />
        </div>

        <h2 className="relative text-[32px] leading-none font-black text-[var(--bb-text-hi)] tracking-tight uppercase">
          Blinkbox MCP for any AI
        </h2>
        <p className="relative text-[14px] text-[var(--bb-text-lo)] mt-3.5 max-w-[460px] leading-relaxed">
          Connect Blinkbox to your favorite AI chat and run, build, and manage your
          automations straight from your prompts.
        </p>
      </div>

      {/* ── MCP Server URL ── */}
      <div className="bb-card bb-reflect rounded-2xl px-6 py-6 mb-8">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="bb-eyebrow">MCP Server URL</span>
          <span className="text-[9px] font-semibold text-[var(--bb-text-lo)] px-2 py-0.5 rounded-full bb-pill">Streamable HTTP</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="flex-1 min-w-0 rounded-xl px-4 py-3.5 text-[14px] text-[var(--bb-text-hi)] font-mono truncate" style={{ background: 'var(--bb-surface-0)', border: '1px solid var(--bb-border)' }}>
            {MCP_URL}
          </code>
          <CopyBtn value={MCP_URL} />
        </div>
        <p className="text-[12px] text-[var(--bb-text-lo)] mt-4 leading-relaxed">
          In your AI app, add a custom MCP / connector, paste this URL, and authenticate with one of
          your API keys. That’s the entire setup — no extra config.
        </p>
      </div>

      {/* ── MCP Keys ── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bb-divider border-t" />
        <span className="bb-eyebrow">MCP Keys</span>
        <div className="h-px flex-1 bb-divider border-t" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-[var(--bb-text-dim)]">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : keys.length === 0 ? (
        <div className="bb-card bb-reflect rounded-2xl flex flex-col items-center justify-center py-12 text-center">
          <KeyRound className="w-8 h-8 text-[var(--bb-text-dim)] mb-3" />
          <p className="text-[13px] text-[var(--bb-text-lo)] font-medium">No MCP keys yet.</p>
          <p className="text-[12px] text-[var(--bb-text-dim)] mt-1">Create one in Credentials to authenticate your AI chat.</p>
        </div>
      ) : (
        <div className="bb-card bb-reflect rounded-2xl overflow-hidden">
          {keys.map((k) => {
            const id = k.id || k._id;
            return (
              <div
                key={id}
                className="group flex items-center justify-between px-4 py-3 border-t bb-divider first:border-t-0 hover:bg-white/[0.025] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--bb-surface-2)', border: '1px solid var(--bb-border)', color: 'var(--bb-text-lo)' }}>
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-semibold text-[var(--bb-text-hi)] truncate">{k.label}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-[var(--bb-text-dim)] font-mono">{k.prefix}••••</span>
                      <span className="text-[var(--bb-text-dim)]">·</span>
                      <span className="text-[11px] text-[var(--bb-text-dim)]">used {timeAgo(k.lastUsedAt)}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => handleRevoke(id)}
                  className="p-2 text-[var(--bb-text-dim)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100" title="Revoke key">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
