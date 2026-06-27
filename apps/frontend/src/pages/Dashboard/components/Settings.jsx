import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Server, Zap, ChevronRight,
  Loader2, Check, AlertTriangle, Shield,
} from 'lucide-react';
import api from '../../../lib/api';
import { toast } from 'sonner';
import logoGoogle from '../../../assets/credentials/google-color.svg';

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, description, children }) {
  return (
    <div className="border-b border-[var(--bb-border-subtle)] pb-8 mb-8 last:border-none last:pb-0 last:mb-0">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--bb-text-hi)]">{title}</h3>
          {description && <p className="text-[12px] text-[var(--bb-text-lo)] mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Field row ─────────────────────────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <div className="flex items-start gap-6 px-4 py-3.5 border-b border-[var(--bb-border-subtle)] last:border-none">
      <div className="w-[180px] shrink-0">
        <p className="text-[12px] font-medium text-[var(--bb-text-mid)]">{label}</p>
        {hint && <p className="text-[11px] text-[var(--bb-text-dim)] mt-0.5 leading-snug">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ── Text input ─────────────────────────────────────────────────────────────────
function Input({ type = 'text', value, onChange, disabled, placeholder }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full max-w-[360px] bg-[var(--bb-surface-0)] border border-[var(--bb-border)] rounded-xl px-3.5 py-2.5 text-[13px] text-[var(--bb-text-hi)] focus:outline-none focus:border-[var(--bb-accent-ring)] disabled:opacity-40 disabled:cursor-not-allowed placeholder:text-[var(--bb-text-dim)] transition-colors"
    />
  );
}

// ── Save button ────────────────────────────────────────────────────────────────
function SaveBtn({ onClick, saving, success, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={saving || disabled}
      className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-40 ${success ? '' : 'bb-card'}`}
      style={success
        ? { background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }
        : { color: 'var(--bb-text-hi)' }}
    >
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : success ? <Check className="w-3.5 h-3.5" /> : null}
      {saving ? 'Saving…' : success ? 'Saved' : 'Save changes'}
    </button>
  );
}

// ── Avatar initials ───────────────────────────────────────────────────────────
function Avatar({ name, size = 48 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-2xl flex items-center justify-center text-white font-bold select-none shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35, background: 'linear-gradient(135deg,var(--bb-surface-2),var(--bb-surface-1))', border: '1px solid var(--bb-border)' }}
    >
      {initials}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function Settings({ user }) {
  const navigate = useNavigate();

  // Profile
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileOk, setProfileOk] = useState(false);

  // Password
  const [pwCurrent, setPwCurrent]   = useState('');
  const [pwNew, setPwNew]           = useState('');
  const [pwConfirm, setPwConfirm]   = useState('');
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwOk, setPwOk]             = useState(false);
  const [pwError, setPwError]       = useState('');

  // Billing
  const [usage, setUsage]           = useState(null);

  // System (admin)
  const [systemStats, setSystemStats]   = useState(null);
  const [isTogglingPause, setIsTogglingPause] = useState(false);

  // Account (live profile — tells us auth provider)
  const [authProvider, setAuthProvider] = useState(user?.authProvider || 'local');

  useEffect(() => {
    api.get('/api/billing/usage').then(r => setUsage(r.data)).catch(() => {});
    api.get('/api/system/stats').then(r => setSystemStats(r.data)).catch(() => {});
    api.get('/api/profile').then(r => {
      setAuthProvider(r.data.authProvider || 'local');
    }).catch(() => {});
  }, []);

  const isGoogleUser = authProvider === 'google';

  const handleSaveProfile = async () => {
    if (!profileName.trim()) return;
    setProfileSaving(true); setProfileOk(false);
    try {
      await api.put('/api/profile', { name: profileName.trim() });
      const updated = { ...user, name: profileName.trim() };
      localStorage.setItem('blinkbox_user', JSON.stringify(updated));
      setProfileOk(true);
      setTimeout(() => setProfileOk(false), 3000);
    } catch { toast.error('Failed to save profile'); }
    setProfileSaving(false);
  };

  const handleChangePassword = async () => {
    setPwError('');
    if (!pwCurrent || !pwNew) return;
    if (pwNew !== pwConfirm) { setPwError('Passwords do not match'); return; }
    if (pwNew.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setPwSaving(true); setPwOk(false);
    try {
      await api.post('/api/profile/change-password', { currentPassword: pwCurrent, newPassword: pwNew });
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
      setPwOk(true);
      setTimeout(() => setPwOk(false), 3000);
    } catch (e) { setPwError(e.response?.data?.message || 'Failed to update password'); }
    setPwSaving(false);
  };

  const handleToggleWorkers = async () => {
    if (!systemStats || isTogglingPause) return;
    setIsTogglingPause(true);
    try {
      const paused = systemStats.workersPaused;
      await api.post(paused ? '/api/system/resume' : '/api/system/pause');
      setSystemStats(s => ({ ...s, workersPaused: !paused }));
    } catch { toast.error('Failed to toggle workers'); }
    setIsTogglingPause(false);
  };

  const isPro = usage?.plan === 'pro';
  const creditPct = usage ? Math.min(100, Math.round((usage.creditsUsed / usage.monthlyLimit) * 100)) : 0;

  return (
    <div style={{ animation: 'dbFadeIn 0.15s ease-out' }}>

      {/* Page header */}
      <div className="mb-10">
        <h2 className="text-[18px] font-bold text-[var(--bb-text-hi)] tracking-tight">Settings</h2>
        <p className="text-[12px] text-[var(--bb-text-lo)] mt-0.5">Manage your account and workspace</p>
      </div>

      {/* ── Profile ── */}
      <Section title="Profile" description="Your name and email address">
        <div className="flex items-center gap-4 mb-6 p-4 bb-card bb-liquid rounded-2xl">
          <Avatar name={profileName || user?.name} size={52} />
          <div>
            <p className="text-[14px] font-semibold text-[var(--bb-text-hi)]">{user?.name || '—'}</p>
            <p className="text-[12px] text-[var(--bb-text-lo)]">{user?.email}</p>
            {user?.role === 'admin' && (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                <Shield className="w-2.5 h-2.5" /> Admin
              </span>
            )}
          </div>
        </div>

        <div className="bb-card bb-liquid rounded-2xl overflow-hidden">
          <Field label="Display name" hint="Shown to collaborators">
            <Input value={profileName} onChange={e => setProfileName(e.target.value)} />
          </Field>
          <Field label="Email address" hint="Cannot be changed">
            <Input value={user?.email || ''} disabled />
          </Field>
        </div>
        <SaveBtn onClick={handleSaveProfile} saving={profileSaving} success={profileOk} disabled={!profileName.trim()} />
      </Section>

      {/* ── Security ── */}
      <Section title="Security" description="Protect your account">
        {isGoogleUser ? (
          <div className="flex items-center gap-3 px-4 py-3.5 bb-card bb-liquid rounded-2xl">
            <img src={logoGoogle} alt="" className="w-4 h-4 shrink-0" />
            <p className="text-[12px] text-[var(--bb-text-mid)]">
              You sign in with Google, so there's no password to manage here.
            </p>
          </div>
        ) : (
          <>
            <div className="bb-card bb-liquid rounded-2xl overflow-hidden">
              <Field label="Current password">
                <Input type="password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} placeholder="••••••••" />
              </Field>
              <Field label="New password" hint="At least 8 characters">
                <Input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="••••••••" />
              </Field>
              <Field label="Confirm password">
                <Input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="••••••••" />
              </Field>
            </div>
            {pwError && (
              <div className="mt-3 flex items-center gap-2 text-[12px] text-red-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {pwError}
              </div>
            )}
            <SaveBtn onClick={handleChangePassword} saving={pwSaving} success={pwOk} disabled={!pwCurrent || !pwNew || !pwConfirm} />
          </>
        )}
      </Section>

      {/* ── Billing ── */}
      <Section title="Billing" description="Your plan and usage">
        <div className="bb-card bb-liquid rounded-2xl overflow-hidden mb-4">
          <div className="p-5 flex items-center justify-between border-b border-[var(--bb-border-subtle)]">
            <div>
              <p className="text-[12px] text-[var(--bb-text-lo)] mb-1">Current plan</p>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold text-[var(--bb-text-hi)] capitalize">{usage?.plan || 'Free'}</span>
                {isPro && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ color: 'var(--bb-accent-hot)', background: 'var(--bb-accent-soft)', border: '1px solid var(--bb-accent-ring)' }}>Active</span>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/upgrade')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all ${isPro ? 'bb-card' : 'bb-btn bb-btn-primary'}`}
              style={isPro ? { color: 'var(--bb-text-mid)' } : undefined}
            >
              {isPro ? 'Manage plan' : (
                <><Zap className="w-3.5 h-3.5" /> Upgrade to Pro</>
              )}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {usage && !isPro && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[12px] text-[var(--bb-text-lo)]">Credits used this month</p>
                <p className="text-[12px] font-semibold text-[var(--bb-text-hi)] tabular-nums">
                  {usage.creditsUsed.toLocaleString()} / {usage.monthlyLimit.toLocaleString()}
                </p>
              </div>
              <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--bb-surface-3)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${creditPct}%`,
                    background: creditPct > 80 ? '#f87171' : creditPct > 60 ? '#f59e0b' : '#fafafa',
                  }}
                />
              </div>
              <p className="text-[11px] text-[var(--bb-text-dim)] mt-2">{creditPct}% used · resets each billing cycle</p>
            </div>
          )}

          {usage && isPro && (
            <div className="p-5">
              <p className="text-[12px] text-[var(--bb-text-lo)]">Unlimited executions and workflows on your Pro plan.</p>
            </div>
          )}
        </div>
      </Section>

      {/* ── System (admin only) ── */}
      {systemStats && (
        <Section title="System" description="Execution engine controls (admin only)">
          <div className="bb-card bb-liquid rounded-2xl overflow-hidden mb-4">
            <Field label="Active executions">
              <span className="text-[13px] font-mono text-[var(--bb-text-hi)]">{systemStats.activeExecutions ?? '—'}</span>
            </Field>
            <Field label="Worker status">
              <span className={`text-[13px] font-semibold ${systemStats.workersPaused ? 'text-amber-400' : 'text-emerald-400'}`}>
                {systemStats.workersPaused ? 'Paused' : 'Running'}
              </span>
            </Field>
          </div>
          <button
            onClick={handleToggleWorkers}
            disabled={isTogglingPause}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold border transition-all disabled:opacity-40 ${
              systemStats.workersPaused
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
            }`}
          >
            {isTogglingPause ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
            {systemStats.workersPaused ? 'Resume workers' : 'Pause workers'}
          </button>
        </Section>
      )}
    </div>
  );
}
