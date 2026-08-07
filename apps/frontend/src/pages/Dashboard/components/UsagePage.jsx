import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Zap, Sparkles, Gauge, Activity, Wallet, Infinity as InfinityIcon,
  Check, Loader2, ArrowUpRight, Receipt,
} from 'lucide-react';
import api from '../../../lib/api';
import AutoRecharge from './AutoRecharge';
import RedeemGift from './RedeemGift';
import { creditsToUsd, fmtCredits as fmt, fmtUsd, usedPercent } from '../../../lib/credits';

const PLAN_LABEL = { free: 'Free', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };

const prettyNode = (type) =>
  String(type || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

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

export default function UsagePage({ usage, onRefresh, onBuyCredits }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalog, setCatalog] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    api.get('/api/billing/catalog').then((r) => setCatalog(r.data)).catch(() => {});
    api.get('/api/billing/history').then((r) => setHistory(r.data.history || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const upgrade = searchParams.get('upgrade');
    const purchase = searchParams.get('purchase');
    if (!upgrade && !purchase) return;

    if (upgrade === 'success') toast.success('You are on Pro. 30,000 credits added.');
    if (purchase === 'success') toast.success('Credits added to your balance.');
    if (upgrade === 'cancelled' || purchase === 'cancelled') toast('Checkout cancelled.');

    const next = new URLSearchParams(searchParams);
    next.delete('upgrade');
    next.delete('purchase');
    setSearchParams(next, { replace: true });
    if ((upgrade === 'success' || purchase === 'success') && onRefresh) onRefresh();
  }, [searchParams, setSearchParams, onRefresh]);

  const start = useCallback(async (key, url, body) => {
    setBusy(key);
    try {
      const { data } = await api.post(url, body);
      window.location.href = data.url;
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not open checkout.');
      setBusy(null);
    }
  }, []);

  const breakdown = useMemo(() => {
    const totals = new Map();
    for (const entry of history) {
      totals.set(entry.nodeType, (totals.get(entry.nodeType) || 0) + entry.credits);
    }
    const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = rows[0]?.[1] || 1;
    return rows.map(([type, credits]) => ({ type, credits, pct: Math.round((credits / max) * 100) }));
  }, [history]);

  if (!usage) {
    return (
      <div className="flex items-center justify-center py-24 text-[13px] text-[var(--bb-text-lo)]">
        Loading credits…
      </div>
    );
  }

  const planRemaining = usage.planRemaining ?? Math.max(0, usage.monthlyLimit - usage.creditsUsed);
  const purchased = usage.purchasedCredits || 0;
  const balance = usage.balance ?? planRemaining + purchased;
  const perUsd = usage.creditsPerUsd || catalog?.payg?.creditsPerUsd;
  const balanceUsd = usage.balanceUsd ?? creditsToUsd(balance, perUsd);
  const planRemainingUsd = usage.planRemainingUsd ?? creditsToUsd(planRemaining, perUsd);
  const purchasedUsd = usage.purchasedCreditsUsd ?? creditsToUsd(purchased, perUsd);
  const pct = usedPercent(usage);
  const isPro = usage.plan === 'pro' || usage.plan === 'enterprise';
  const barColor = pct > 80 ? 'bg-red-400' : pct > 50 ? 'bg-amber-400' : 'bg-[var(--bb-accent)]';
  const renews = usage.billingCycleEnd
    ? new Date(usage.billingCycleEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;
  const proPlan = catalog?.plans?.find((p) => p.id === 'pro');
  const payg = catalog?.payg || { creditsPerUsd: 1024 };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--bb-text-hi)]">Credits</h2>
          <p className="text-[12px] text-[var(--bb-text-lo)] mt-0.5">
            Every step a workflow runs spends credits. Buy more whenever you need them.
          </p>
        </div>
        <span className="bb-pill px-2.5 py-1 text-[11px] font-semibold text-[var(--bb-text-mid)]">
          {PLAN_LABEL[usage.plan] || usage.plan} plan
        </span>
      </div>

      {/* Balance — plan bucket first, purchased second */}
      <div className="bb-card bb-liquid rounded-2xl p-5">
        <span className="bb-eyebrow">Available balance</span>
        <div className="flex items-baseline gap-2.5 mt-2">
          <p className="text-[38px] font-semibold text-[var(--bb-text-hi)] leading-none font-mono">
            {fmtUsd(balanceUsd)}
          </p>
          <span className="text-[13px] font-mono text-[var(--bb-text-lo)]">{fmt(balance)} credits</span>
        </div>
        <p className="text-[12px] text-[var(--bb-text-lo)] mt-1.5">
          {fmtUsd(planRemainingUsd)} plan credits{renews ? ` · renews ${renews}` : ''} + {fmtUsd(purchasedUsd)} purchased
        </p>

        <div className="mt-5">
          <div className="flex items-baseline justify-between mb-2">
            <span className="bb-eyebrow">Plan credits used</span>
            <span className="text-[12px] font-mono text-[var(--bb-text-lo)]">{pct}%</span>
          </div>
          <div className="w-full rounded-full h-1.5" style={{ background: 'var(--bb-surface-3)' }}>
            <div className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[12px] font-mono text-[var(--bb-text-dim)] mt-2.5">
            {fmt(usage.creditsUsed)} / {fmt(usage.monthlyLimit)} this cycle
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Activity} label="Used" value={fmt(usage.creditsUsed)} sub="credits this cycle" />
        <StatCard
          icon={Gauge}
          label="Plan left"
          value={fmtUsd(planRemainingUsd)}
          sub={`${fmt(planRemaining)} credits${renews ? ` · resets ${renews}` : ''}`}
        />
        <StatCard
          icon={Wallet}
          label="Purchased"
          value={fmtUsd(purchasedUsd)}
          sub={`${fmt(purchased)} credits · never expires`}
        />
      </div>

      {/* Pay as you go */}
      <div className="bb-card bb-liquid rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4 mb-1">
          <p className="text-[13px] font-semibold text-[var(--bb-text-hi)]">Buy credits</p>
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--bb-text-dim)]">
            <InfinityIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            No expiry, no subscription
          </span>
        </div>
        <p className="text-[12px] text-[var(--bb-text-lo)]">
          Pay as you go — $1 buys {fmt(payg.creditsPerUsd)} credits at any size. Purchased credits are
          spent only after your monthly plan credits run out.
        </p>

        <button
          onClick={onBuyCredits}
          className="bb-btn w-full flex items-center justify-center gap-2 h-10 mt-4 rounded-full bg-[var(--bb-accent)] text-[#09090b] hover:bg-[var(--bb-accent-hot)] text-[13px] font-semibold"
        >
          <Wallet className="w-3.5 h-3.5" strokeWidth={2} />
          Buy credits
        </button>

        {catalog && !catalog.stripeReady && (
          <p className="text-[11px] text-amber-400 mt-3">
            Payments are not configured on this deployment yet.
          </p>
        )}
      </div>

      <RedeemGift onRedeemed={onRefresh} />

      <AutoRecharge usage={usage} catalog={catalog} onSaved={onRefresh} />

      {/* Plan */}
      <div className="bb-card bb-liquid rounded-2xl p-5">
        {isPro ? (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[var(--bb-text-hi)]">
                Pro — ${proPlan?.priceUsd ?? 19}/mo
              </p>
              <p className="text-[12px] text-[var(--bb-text-lo)] mt-0.5">
                {fmt(usage.monthlyLimit)} credits every month, plus any credits you buy. Invoices and cancellation live in the billing portal.
              </p>
            </div>
            <button
              disabled={busy !== null}
              onClick={() => start('portal', '/api/billing/portal')}
              className="bb-btn bb-btn-ghost text-[var(--bb-accent)] flex items-center justify-center gap-2 h-9 px-4 text-[12px] shrink-0 disabled:opacity-50"
            >
              {busy === 'portal' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Manage plan
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--bb-text-hi)]">
                  Pro — ${proPlan?.priceUsd ?? 19}/mo
                </p>
                <p className="text-[12px] text-[var(--bb-text-lo)] mt-0.5">
                  {fmt(proPlan?.credits ?? 30000)} credits every month, and you can still top up any time.
                </p>
              </div>
              <button
                disabled={busy !== null}
                onClick={() => start('checkout', '/api/billing/checkout')}
                className="bb-btn bb-btn-accent flex items-center justify-center gap-2 h-9 px-4 text-[12px] shrink-0 disabled:opacity-50"
              >
                {busy === 'checkout' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Go Pro
              </button>
            </div>
            {proPlan?.features?.length > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {proPlan.features.map((feature) => (
                  <span key={feature} className="flex items-center gap-2 text-[12px] text-[var(--bb-text-lo)]">
                    <Check className="w-3 h-3 shrink-0 text-[var(--bb-accent)]" strokeWidth={2.5} />
                    {feature}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Where credits went */}
      {breakdown.length > 0 && (
        <div className="bb-card bb-liquid rounded-2xl p-5">
          <p className="text-[13px] font-semibold text-[var(--bb-text-hi)]">Where your credits went</p>
          <p className="text-[12px] text-[var(--bb-text-lo)] mt-0.5 mb-4">Top steps from your recent runs.</p>
          <div className="flex flex-col gap-3">
            {breakdown.map((row) => (
              <div key={row.type} className="flex items-center gap-3">
                <span className="text-[12px] text-[var(--bb-text-mid)] w-[38%] truncate">{prettyNode(row.type)}</span>
                <div className="flex-1 rounded-full h-1" style={{ background: 'var(--bb-surface-3)' }}>
                  <div className="h-1 rounded-full bg-[var(--bb-accent)]" style={{ width: `${row.pct}%` }} />
                </div>
                <span className="text-[11px] font-mono text-[var(--bb-text-dim)] w-14 text-right">{fmt(row.credits)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receipts */}
      {usage.purchases?.length > 0 && (
        <div className="bb-card bb-liquid rounded-2xl p-5">
          <div className="flex items-center gap-2 text-[var(--bb-text-lo)] mb-3">
            <Receipt className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            <span className="bb-eyebrow">Recent purchases</span>
          </div>
          <div className="flex flex-col gap-2">
            {usage.purchases.map((p) => (
              <div key={p.sessionId} className="flex items-center justify-between text-[12px]">
                <span className="text-[var(--bb-text-mid)]">
                  {fmt(p.credits)} credits
                  <span className="text-[var(--bb-text-dim)]"> · {new Date(p.at).toLocaleDateString()}</span>
                </span>
                <span className="font-mono text-[var(--bb-text-lo)]">${p.amountUsd}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-[var(--bb-text-dim)] px-1">
        <ArrowUpRight className="w-3 h-3 shrink-0" strokeWidth={2} />
        Triggers are free. Data steps cost 1 credit, app actions 3–5, AI steps 10, browser automation 15.
      </p>
    </div>
  );
}
