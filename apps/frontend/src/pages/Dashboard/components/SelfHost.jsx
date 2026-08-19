import { useState, useEffect, useCallback } from 'react';
import { Trash2, Loader2, Copy, CheckCheck, KeyRound, Plus, Globe, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../lib/api';
import imgBlinkbox from '../../../assets/blinkbox-knot.png';

const INSTALL_CMD = 'curl -fsSL https://raw.githubusercontent.com/blinkboxhq/Blinkbox/main/docker/install.sh | sudo sh';

// The exact session the installer runs — shown so the one thing the user has to
// supply (the key, then a name) is obvious before they ever open a terminal.
const SESSION = [
  { kind: 'cmd', text: INSTALL_CMD },
  { kind: 'dim', text: 'Blinkbox — self-hosted install' },
  { kind: 'ask', text: 'Paste your license key' },
  { kind: 'in',  text: 'bb_selfhost_••••••••••••••••••••' },
  { kind: 'ok',  text: 'License valid — Pro plan' },
  { kind: 'ask', text: 'Choose a name for this instance' },
  { kind: 'in',  text: 'acme' },
  { kind: 'ok',  text: 'Reserved acme.blinkbox.net → 203.0.113.9' },
  { kind: 'ok',  text: 'Blinkbox is running' },
  { kind: 'url', text: 'https://acme.blinkbox.net' },
];

const LINE_COLOR = {
  cmd: 'text-[var(--bb-text-hi)]',
  dim: 'text-[var(--bb-text-dim)]',
  ask: 'text-[var(--bb-text-lo)]',
  in: 'text-[var(--bb-text-hi)]',
  ok: 'text-emerald-400',
  url: 'text-[var(--bb-text-hi)]',
};

function timeAgo(d) {
  if (!d) return 'never';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

function CopyBtn({ value, label = 'Copy' }) {
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

// The hero terminal — rendered once for real, once flipped onto the mirror floor.
function Terminal({ flat = false }) {
  return (
    <div
      className="w-[520px] max-w-full rounded-[20px] overflow-hidden"
      style={{
        background: 'var(--bb-surface-0)',
        border: '1px solid var(--bb-border)',
        boxShadow: flat
          ? 'none'
          : '0 2px 0 0 rgba(255,255,255,0.10) inset, 0 34px 70px -14px rgba(0,0,0,0.95), 0 12px 28px -10px rgba(0,0,0,0.8)',
      }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid var(--bb-border)', background: 'var(--bb-surface-2)' }}>
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[10px] font-mono text-[var(--bb-text-dim)]">root@your-server</span>
        <img src={imgBlinkbox} alt="" className="w-4 h-4 ml-auto opacity-70" draggable={false} />
      </div>
      <div className="px-4 py-3.5 font-mono text-[11.5px] leading-[1.9] text-left">
        {SESSION.map((l, i) => (
          <div key={i} className={`truncate ${LINE_COLOR[l.kind]}`}>
            {l.kind === 'cmd' && <span className="text-emerald-400">$ </span>}
            {l.kind === 'ask' && <span className="text-[var(--bb-text-dim)]">? </span>}
            {l.kind === 'in' && <span className="text-[var(--bb-text-dim)]">&gt; </span>}
            {l.kind === 'ok' && <span>✓ </span>}
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SelfHost() {
  const [licenses, setLicenses] = useState([]);
  const [instances, setInstances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [freshKey, setFreshKey] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [l, i] = await Promise.all([
        api.get('/api/self-host/licenses'),
        api.get('/api/self-host/instances'),
      ]);
      setLicenses(l.data.licenses || []);
      setInstances(i.data.instances || []);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const res = await api.post('/api/self-host/licenses', { label: 'Self-hosted instance' });
      setFreshKey(res.data.licenseKey);
      fetchAll();
      toast.success('License created — copy it now, it is shown once');
    } catch (e) {
      // A 404 here means the cloud API is running a build without the
      // self-host router, and the body is Express's HTML page, not our JSON.
      const status = e?.response?.status;
      toast.error(
        e?.response?.data?.message ||
        (status === 404
          ? 'Self-hosting is not enabled on this Blinkbox server yet.'
          : `Failed to create license${status ? ` (HTTP ${status})` : ''}`),
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id) => {
    try {
      await api.delete(`/api/self-host/licenses/${id}`);
      setLicenses(licenses.filter((k) => (k.id || k._id) !== id));
      fetchAll();
      toast.success('License revoked');
    } catch {
      toast.error('Failed to revoke license');
    }
  };

  return (
    <div style={{ animation: 'dbFadeIn 0.2s ease-out' }} className="max-w-[860px] mx-auto">
      {/* ── Hero: the install itself, floating on a mirror floor ── */}
      <div className="relative flex flex-col items-center text-center pt-6 pb-9">
        <div
          className="absolute inset-x-0 top-0 h-[280px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(255,255,255,0.05), transparent 70%)' }}
        />
        <div className="bb-shaft absolute left-1/2 -translate-x-1/2 top-2 w-[240px] h-[250px] pointer-events-none" />

        <div className="relative w-full flex flex-col items-center mb-8">
          <div className="relative w-full flex items-center justify-center">
            <Terminal />
          </div>
          {/* items-end so the flip puts the terminal's last line nearest the floor */}
          <div className="bb-mirror relative w-full flex items-end justify-center overflow-hidden h-[110px]" aria-hidden>
            <Terminal flat />
          </div>
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-[108px] w-[560px] max-w-[88%] h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22) 50%, transparent)' }}
          />
        </div>

        <h2 className="relative text-[32px] leading-none font-black text-[var(--bb-text-hi)] tracking-tight uppercase">
          Blinkbox on your own server
        </h2>
        <p className="relative text-[14px] text-[var(--bb-text-lo)] mt-3.5 max-w-[470px] leading-relaxed">
          One command, one license key, one name. Your workflows and data live on your
          machine — your plan and credits come with you.
        </p>
      </div>

      {/* ── Install command ── */}
      <div className="bb-card bb-reflect rounded-2xl px-6 py-6 mb-6">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="bb-eyebrow">Install</span>
          <span className="text-[9px] font-semibold text-[var(--bb-text-lo)] px-2 py-0.5 rounded-full bb-pill">Linux · Docker</span>
        </div>

        <div className="flex items-center gap-3">
          <code className="flex-1 min-w-0 rounded-xl px-4 py-3.5 text-[13.5px] text-[var(--bb-text-hi)] font-mono truncate" style={{ background: 'var(--bb-surface-0)', border: '1px solid var(--bb-border)' }}>
            {INSTALL_CMD}
          </code>
          <CopyBtn value={INSTALL_CMD} label="Copy command" />
        </div>

        <p className="text-[12px] text-[var(--bb-text-lo)] mt-4 leading-relaxed">
          Run it on any Linux box with a public IP. It asks for your license key, then a
          name, and puts the instance on <span className="font-mono text-[var(--bb-text-mid)]">name.blinkbox.net</span> with
          a certificate — DNS included. If the name is taken it becomes{' '}
          <span className="font-mono text-[var(--bb-text-mid)]">name-v2</span>. Docker is installed for you if it is missing.
        </p>
      </div>

      {/* ── License key ── */}
      <div className="bb-card bb-reflect rounded-2xl px-6 py-6 mb-8">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="bb-eyebrow">License key</span>
            <span className="text-[9px] font-semibold text-[var(--bb-text-lo)] px-2 py-0.5 rounded-full bb-pill">Shown once</span>
          </div>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="bb-btn bb-btn-ghost flex items-center gap-2 px-3.5 py-2.5 text-[12px] shrink-0 disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            New license
          </button>
        </div>

        {freshKey ? (
          <div className="flex items-center gap-3">
            <code className="flex-1 min-w-0 rounded-xl px-4 py-3.5 text-[13px] text-[var(--bb-text-hi)] font-mono truncate" style={{ background: 'var(--bb-surface-0)', border: '1px solid var(--bb-border)' }}>
              {freshKey}
            </code>
            <CopyBtn value={freshKey} label="Copy key" />
          </div>
        ) : (
          <div className="rounded-xl px-4 py-3.5 text-[13px] font-mono text-[var(--bb-text-dim)]" style={{ background: 'var(--bb-surface-0)', border: '1px solid var(--bb-border)' }}>
            bb_selfhost_…
          </div>
        )}

        <p className="text-[12px] text-[var(--bb-text-lo)] mt-4 leading-relaxed">
          Paste this into the installer when it asks. It is a token for the credits API and
          nothing more — it grants no access to any Blinkbox database, and can only spend
          your own credits. Revoke it and the instance stops running nodes.
        </p>
      </div>

      {/* ── Instances ── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bb-divider border-t" />
        <span className="bb-eyebrow">Instances</span>
        <div className="h-px flex-1 bb-divider border-t" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-[var(--bb-text-dim)]">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : instances.length === 0 ? (
        <div className="bb-card bb-reflect rounded-2xl flex flex-col items-center justify-center py-12 text-center mb-8">
          <Globe className="w-8 h-8 text-[var(--bb-text-dim)] mb-3" />
          <p className="text-[13px] text-[var(--bb-text-lo)] font-medium">No self-hosted instances yet.</p>
          <p className="text-[12px] text-[var(--bb-text-dim)] mt-1">They appear here the moment the installer registers a name.</p>
        </div>
      ) : (
        <div className="bb-card bb-reflect rounded-2xl overflow-hidden mb-8">
          {instances.map((inst) => (
            <div key={inst._id || inst.hostname} className="flex items-center justify-between px-4 py-3 border-t bb-divider first:border-t-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--bb-surface-2)', border: '1px solid var(--bb-border)', color: 'var(--bb-text-lo)' }}>
                  <Globe className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <a href={`https://${inst.hostname}`} target="_blank" rel="noreferrer"
                    className="text-[13px] font-semibold text-[var(--bb-text-hi)] truncate hover:underline">
                    {inst.hostname}
                  </a>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-[var(--bb-text-dim)] font-mono">{inst.ip || '—'}</span>
                    <span className="text-[var(--bb-text-dim)]">·</span>
                    <span className="text-[11px] text-[var(--bb-text-dim)]">seen {timeAgo(inst.lastSeenAt)}</span>
                  </div>
                </div>
              </div>
              {inst.version && (
                <span className="text-[10px] font-mono text-[var(--bb-text-dim)] px-2 py-0.5 rounded-full bb-pill shrink-0">{inst.version}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Licenses ── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bb-divider border-t" />
        <span className="bb-eyebrow">Licenses</span>
        <div className="h-px flex-1 bb-divider border-t" />
      </div>

      {isLoading ? null : licenses.length === 0 ? (
        <div className="bb-card bb-reflect rounded-2xl flex flex-col items-center justify-center py-12 text-center">
          <KeyRound className="w-8 h-8 text-[var(--bb-text-dim)] mb-3" />
          <p className="text-[13px] text-[var(--bb-text-lo)] font-medium">No licenses yet.</p>
          <p className="text-[12px] text-[var(--bb-text-dim)] mt-1">Create one above, then run the install command.</p>
        </div>
      ) : (
        <div className="bb-card bb-reflect rounded-2xl overflow-hidden">
          {licenses.map((k) => {
            const id = k.id || k._id;
            return (
              <div key={id} className="group flex items-center justify-between px-4 py-3 border-t bb-divider first:border-t-0 hover:bg-white/[0.025] transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--bb-surface-2)', border: '1px solid var(--bb-border)', color: 'var(--bb-text-lo)' }}>
                    <ShieldCheck className="w-4 h-4" />
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
                  className="p-2 text-[var(--bb-text-dim)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100" title="Revoke license">
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
