import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, Infinity as InfinityIcon, ShieldCheck,
  Boxes, Plug, Sparkles, Globe,
} from 'lucide-react';
import api from '../../../lib/api';
import AutoRecharge from './AutoRecharge';
import { creditsToUsd, fmtCredits as fmt, fmtUsd } from '../../../lib/credits';

const FALLBACK = { creditsPerUsd: 1024, minUsd: 5, maxUsd: 500 };
const DEFAULT_USD = 25;

// Mirrors the NODE_COSTS tiers in the execution engine.
const WHAT_YOU_GET = [
  { icon: Boxes, label: 'Data steps', cost: 1 },
  { icon: Plug, label: 'App actions', cost: 5 },
  { icon: Sparkles, label: 'AI steps', cost: 10 },
  { icon: Globe, label: 'Browser runs', cost: 15 },
];

export default function BuyCredits({ usage, onBack, onRefresh }) {
  const [catalog, setCatalog] = useState(null);
  const [usd, setUsd] = useState(DEFAULT_USD);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/api/billing/catalog').then((r) => setCatalog(r.data)).catch(() => {});
  }, []);

  const payg = catalog?.payg || FALLBACK;
  const presets = useMemo(
    () => (catalog?.packs || []).map((p) => p.priceUsd).filter((p) => p >= payg.minUsd && p <= payg.maxUsd),
    [catalog, payg.minUsd, payg.maxUsd],
  );

  const clamp = useCallback(
    (value) => Math.min(payg.maxUsd, Math.max(payg.minUsd, Math.round(value) || payg.minUsd)),
    [payg.minUsd, payg.maxUsd],
  );

  // The custom input may be mid-edit (empty or out of range) — everything
  // downstream reads the clamped value so the totals never show NaN.
  const amount = clamp(Number(usd));
  const credits = amount * payg.creditsPerUsd;
  const pct = ((amount - payg.minUsd) / (payg.maxUsd - payg.minUsd)) * 100;
  const balance = usage?.balance ?? 0;
  const balanceUsd = usage?.balanceUsd ?? creditsToUsd(balance, usage?.creditsPerUsd || payg.creditsPerUsd);

  const buy = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/api/billing/credits', { amountUsd: amount });
      window.location.href = data.url;
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not open checkout.');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="bb-btn bb-btn-ghost flex h-8 w-8 shrink-0 items-center justify-center p-0"
          aria-label="Back to credits"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
        </button>
        <div>
          <h2 className="text-[15px] font-bold text-[var(--bb-text-hi)]">Buy credits</h2>
          <p className="text-[12px] text-[var(--bb-text-lo)] mt-0.5">
            Slide to pick an amount. One flat rate, no subscription.
          </p>
        </div>
      </div>

      <div className="bb-card bb-liquid rounded-2xl p-5">
        <span className="bb-eyebrow">You get</span>
        <div className="flex items-baseline gap-2 mt-2">
          <p className="text-[42px] font-semibold text-[var(--bb-text-hi)] leading-none font-mono">
            {fmt(credits)}
          </p>
          <span className="text-[13px] text-[var(--bb-text-lo)]">credits</span>
        </div>
        <p className="text-[12px] text-[var(--bb-text-lo)] mt-1.5">
          $1 = {fmt(payg.creditsPerUsd)} credits · same rate at every size
        </p>

        <div className="mt-6">
          <input
            type="range"
            min={payg.minUsd}
            max={payg.maxUsd}
            step={1}
            value={amount}
            onChange={(e) => setUsd(Number(e.target.value))}
            aria-label="Amount in dollars"
            style={{ '--bb-fill': `${pct}%` }}
            className="w-full h-5 cursor-pointer appearance-none bg-transparent
              [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full
              [&::-webkit-slider-runnable-track]:[background:linear-gradient(to_right,var(--bb-accent)_var(--bb-fill),var(--bb-surface-3)_var(--bb-fill))]
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-[var(--bb-accent)]
              [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_var(--bb-accent-soft)]
              [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full
              [&::-moz-range-track]:[background:linear-gradient(to_right,var(--bb-accent)_var(--bb-fill),var(--bb-surface-3)_var(--bb-fill))]
              [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--bb-accent)]"
          />
          <div className="flex items-center justify-between mt-1.5 text-[11px] font-mono text-[var(--bb-text-dim)]">
            <span>${payg.minUsd}</span>
            <span>${payg.maxUsd}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-5">
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => setUsd(preset)}
              className={`bb-pill px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                amount === preset
                  ? 'text-[var(--bb-accent-hot)] border-[var(--bb-accent-ring)]'
                  : 'text-[var(--bb-text-lo)] hover:text-[var(--bb-text-hi)]'
              }`}
            >
              ${preset}
            </button>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[12px] text-[var(--bb-text-dim)]">$</span>
            <input
              type="number"
              inputMode="numeric"
              min={payg.minUsd}
              max={payg.maxUsd}
              value={usd}
              aria-label="Custom amount in dollars"
              onChange={(e) => setUsd(e.target.value === '' ? '' : Number(e.target.value))}
              onBlur={(e) => setUsd(clamp(Number(e.target.value)))}
              className="bb-panel w-[86px] px-2.5 py-1.5 text-[13px] font-mono text-[var(--bb-text-hi)] text-right focus:outline-none"
            />
          </div>
        </div>

        <button
          disabled={busy || !catalog?.stripeReady}
          onClick={buy}
          className="bb-btn w-full flex items-center justify-center gap-2 h-11 mt-5 rounded-full bg-[var(--bb-accent)] text-[#09090b] hover:bg-[var(--bb-accent-hot)] text-[13px] font-semibold disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {busy ? 'Opening checkout…' : `Pay $${amount}`}
        </button>

        {catalog && !catalog.stripeReady && (
          <p className="text-[11px] text-amber-400 mt-3 text-center">
            Payments are not configured on this deployment yet.
          </p>
        )}

        <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-[var(--bb-text-dim)]">
          <span className="flex items-center gap-1.5">
            <InfinityIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            Never expires
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            Secure checkout by Stripe
          </span>
        </div>
      </div>

      <div className="bb-card bb-liquid rounded-2xl p-5">
        <p className="text-[13px] font-semibold text-[var(--bb-text-hi)]">What that runs</p>
        <p className="text-[12px] text-[var(--bb-text-lo)] mt-0.5 mb-4">
          Roughly, if you spent it all on one kind of step. Triggers are always free.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {WHAT_YOU_GET.map(({ icon: Icon, label, cost }) => (
            <div key={label} className="bb-panel p-3.5 flex flex-col gap-1">
              <Icon className="w-3.5 h-3.5 shrink-0 text-[var(--bb-text-lo)]" strokeWidth={1.75} />
              <span className="text-[15px] font-semibold text-[var(--bb-text-hi)] font-mono leading-none mt-1">
                {fmt(Math.floor(credits / cost))}
              </span>
              <span className="text-[11px] text-[var(--bb-text-dim)]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <AutoRecharge usage={usage} catalog={catalog} onSaved={onRefresh} />

      <p className="text-[12px] text-[var(--bb-text-lo)] px-1">
        You have <span className="font-mono text-[var(--bb-text-mid)]">{fmtUsd(balanceUsd)}</span> of
        credits now ({fmt(balance)}) — this takes you to{' '}
        <span className="font-mono text-[var(--bb-text-mid)]">{fmtUsd(balanceUsd + amount)}</span> (
        {fmt(balance + credits)}). Purchased credits are spent only after your monthly plan credits
        run out.
      </p>
    </div>
  );
}
