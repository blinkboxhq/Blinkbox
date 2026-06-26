import { useNavigate } from 'react-router-dom';
import { Zap, Sparkles, Gauge, Activity, Layers } from 'lucide-react';

const PLAN_LABEL = { free: 'Free', starter: 'Starter', pro: 'Pro', business: 'Business' };

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bb-card bb-liquid rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[var(--bb-text-lo)]">
        <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
        <span className="bb-eyebrow">{label}</span>
      </div>
      <p className="text-[22px] font-semibold text-[var(--bb-text-hi)] leading-none font-mono">{value}</p>
      {sub && <p className="text-[11px] text-[var(--bb-text-dim)]">{sub}</p>}
    </div>
  );
}

export default function UsagePage({ usage }) {
  const navigate = useNavigate();

  if (!usage) {
    return (
      <div className="flex items-center justify-center py-24 text-[13px] text-[var(--bb-text-lo)]">
        Loading usage…
      </div>
    );
  }

  const pct = Math.min(100, usage.percentUsed ?? Math.round((usage.creditsUsed / usage.monthlyLimit) * 100));
  const remaining = usage.remaining ?? (usage.monthlyLimit - usage.creditsUsed);
  const isPaid = usage.plan !== 'free' && usage.plan !== 'starter';
  const barColor = pct > 80 ? 'bg-red-400' : pct > 50 ? 'bg-amber-400' : 'bg-[var(--bb-accent)]';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--bb-text-hi)]">Usage</h2>
          <p className="text-[12px] text-[var(--bb-text-lo)] mt-0.5">Your credit consumption this billing period.</p>
        </div>
        <span className="bb-pill px-2.5 py-1 text-[11px] font-semibold text-[var(--bb-text-mid)]">
          {PLAN_LABEL[usage.plan] || usage.plan} plan
        </span>
      </div>

      {/* Primary meter */}
      <div className="bb-card bb-liquid rounded-2xl p-5">
        <div className="flex items-baseline justify-between mb-3">
          <span className="bb-eyebrow">Credits used</span>
          <span className="text-[12px] font-mono text-[var(--bb-text-lo)]">{pct}%</span>
        </div>
        <div className="w-full rounded-full h-1.5" style={{ background: 'var(--bb-surface-3)' }}>
          <div className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[12px] font-mono text-[var(--bb-text-dim)] mt-2.5">
          {usage.creditsUsed} / {usage.monthlyLimit} credits
        </p>
      </div>

      {/* Stat grid — uniform bb-panel pattern */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Activity} label="Used" value={usage.creditsUsed} sub="this period" />
        <StatCard icon={Gauge} label="Remaining" value={remaining} sub={`of ${usage.monthlyLimit}`} />
        <StatCard icon={Layers} label="Limit" value={usage.monthlyLimit} sub="monthly" />
      </div>

      {/* Upgrade — same panel material, accent only on the action */}
      <div className="bb-card bb-liquid rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[var(--bb-text-hi)]">
            {isPaid ? 'Manage your plan' : 'Need more credits?'}
          </p>
          <p className="text-[12px] text-[var(--bb-text-lo)] mt-0.5">
            {isPaid ? 'View invoices, change plan, or cancel anytime.' : 'Upgrade to Pro for a higher monthly limit.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/upgrade')}
          className={`bb-btn ${isPaid ? 'bb-btn-ghost text-[var(--bb-accent)]' : 'bb-btn-accent'} flex items-center justify-center gap-2 h-9 px-4 text-[12px] shrink-0`}
        >
          {isPaid ? <Sparkles className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
          {isPaid ? 'Manage plan' : 'Upgrade to Pro'}
        </button>
      </div>
    </div>
  );
}
