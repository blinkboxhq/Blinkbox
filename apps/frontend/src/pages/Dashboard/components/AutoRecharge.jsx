import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { RefreshCw, CreditCard, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../../../lib/api';
import { CREDITS_PER_USD, creditsToUsd, fmtCredits, fmtUsd } from '../../../lib/credits';

const TRIGGER_CHOICES = [1, 5, 10, 25];
const TOPUP_CHOICES = [10, 25, 50, 100];
const CAP_CHOICES = [50, 100, 250, 500];

const DEFAULTS = { triggerUsd: 5, topUpUsd: 25, capUsd: 100 };

function Choices({ label, hint, options, value, onChange }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <span className="bb-eyebrow">{label}</span>
        {hint && <span className="text-[11px] text-[var(--bb-text-dim)]">{hint}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`bb-pill px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              value === option
                ? 'text-[var(--bb-accent-hot)] border-[var(--bb-accent-ring)]'
                : 'text-[var(--bb-text-lo)] hover:text-[var(--bb-text-hi)]'
            }`}
          >
            ${option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AutoRecharge({ usage, catalog, onSaved }) {
  const auto = usage?.autoRecharge;
  const perUsd = usage?.creditsPerUsd || catalog?.payg?.creditsPerUsd || CREDITS_PER_USD;

  const [enabled, setEnabled] = useState(false);
  const [triggerUsd, setTriggerUsd] = useState(DEFAULTS.triggerUsd);
  const [topUpUsd, setTopUpUsd] = useState(DEFAULTS.topUpUsd);
  const [capUsd, setCapUsd] = useState(DEFAULTS.capUsd);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auto?.enabled) {
      setEnabled(false);
      return;
    }
    setEnabled(true);
    setTriggerUsd(Math.round(creditsToUsd(auto.thresholdCredits, perUsd)) || DEFAULTS.triggerUsd);
    setTopUpUsd(auto.amountUsd || DEFAULTS.topUpUsd);
    setCapUsd(auto.monthlyCapUsd || DEFAULTS.capUsd);
  }, [auto?.enabled, auto?.thresholdCredits, auto?.amountUsd, auto?.monthlyCapUsd, perUsd]);

  const hasCard = Boolean(auto?.hasCard);
  const spent = auto?.spentThisCycleUsd || 0;

  const dirty =
    enabled &&
    auto?.enabled &&
    (topUpUsd !== auto.amountUsd ||
      capUsd !== auto.monthlyCapUsd ||
      Math.round(creditsToUsd(auto.thresholdCredits, perUsd)) !== triggerUsd);

  const save = async (nextEnabled) => {
    if (nextEnabled) {
      if (!hasCard) {
        toast.error('Buy credits once first — that saves the card auto top-up will use.');
        return;
      }
      // Mirrors the backend rule: a top-up that lands back under the trigger
      // would just charge again on the next step.
      if (topUpUsd <= triggerUsd) {
        toast.error('The top-up has to be bigger than the trigger amount.');
        return;
      }
      if (capUsd < topUpUsd) {
        toast.error('The monthly limit has to cover at least one top-up.');
        return;
      }
    }

    setSaving(true);
    try {
      await api.put('/api/billing/auto-recharge', nextEnabled
        ? {
            enabled: true,
            thresholdCredits: Math.round(triggerUsd * perUsd),
            amountUsd: topUpUsd,
            monthlyCapUsd: capUsd,
          }
        : { enabled: false });
      setEnabled(nextEnabled);
      toast.success(nextEnabled ? 'Auto top-up is on.' : 'Auto top-up is off.');
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save auto top-up.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bb-card bb-liquid rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--bb-text-hi)]">
            <RefreshCw className="w-3.5 h-3.5 shrink-0 text-[var(--bb-text-lo)]" strokeWidth={1.75} />
            Auto top-up
          </p>
          <p className="text-[12px] text-[var(--bb-text-lo)] mt-0.5">
            Never run dry — we buy more credits for you when the balance gets low.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={enabled}
          aria-label="Auto top-up"
          disabled={saving}
          onClick={() => save(!enabled)}
          className={`w-10 h-5 rounded-full shrink-0 transition-colors duration-150 disabled:opacity-50 ${
            enabled ? 'bg-[var(--bb-accent)]' : 'bg-[var(--bb-surface-3)]'
          }`}
        >
          <span
            className={`block w-4 h-4 rounded-full bg-white transition-transform duration-150 ${
              enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {!hasCard && (
        <p className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] px-3 py-2 rounded-lg mt-4">
          Buy credits once above first. That saves your card, and auto top-up uses the same one — we
          never ask for card details ourselves.
        </p>
      )}

      {auto?.lastFailure && (
        <p className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] px-3 py-2 rounded-lg mt-4">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" strokeWidth={1.75} />
          Last top-up did not go through: {auto.lastFailure}
        </p>
      )}

      {enabled && (
        <div className="flex flex-col gap-4 mt-5">
          <Choices
            label="When my balance drops below"
            hint={`${fmtCredits(Math.round(triggerUsd * perUsd))} credits`}
            options={TRIGGER_CHOICES}
            value={triggerUsd}
            onChange={setTriggerUsd}
          />
          <Choices
            label="Buy this much"
            hint={`${fmtCredits(Math.round(topUpUsd * perUsd))} credits`}
            options={TOPUP_CHOICES}
            value={topUpUsd}
            onChange={setTopUpUsd}
          />
          <Choices
            label="Never spend more than"
            hint={`${fmtUsd(spent)} used this cycle`}
            options={CAP_CHOICES}
            value={capUsd}
            onChange={setCapUsd}
          />

          {hasCard && (
            <p className="flex items-center gap-2 text-[11px] text-[var(--bb-text-dim)]">
              <CreditCard className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              <span className="capitalize">{auto.cardBrand || 'Card'}</span> •••• {auto.cardLast4 || '••••'} · charged automatically
            </p>
          )}

          {dirty && (
            <button
              disabled={saving}
              onClick={() => save(true)}
              className="bb-btn w-full flex items-center justify-center gap-2 h-10 rounded-full bg-[var(--bb-accent)] text-[#09090b] hover:bg-[var(--bb-accent-hot)] text-[13px] font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save changes
            </button>
          )}
        </div>
      )}
    </div>
  );
}
