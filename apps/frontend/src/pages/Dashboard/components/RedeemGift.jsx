import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Gift, Loader2, Check, AlertCircle } from 'lucide-react';
import api from '../../../lib/api';
import { fmtCredits as fmt } from '../../../lib/credits';

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LEN = 12;

// Mirrors normalizeCode on the server: strip everything that isn't a code
// character so a pasted "bbox-abcd efgh ijkl" still lands in the right shape.
function tidy(input) {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^BBOX/, '');
  return [...raw].filter((ch) => ALPHABET.includes(ch)).join('').slice(0, CODE_LEN);
}

const display = (raw) => (raw.match(/.{1,4}/g) || []).join('-');

const REASON_COPY = {
  malformed: 'That code is incomplete.',
  not_found: "We don't recognise that code.",
  void: 'That card was cancelled.',
  expired: 'That card has expired.',
  already_redeemed: 'That card has already been redeemed.',
};

export default function RedeemGift({ onRedeemed }) {
  const [raw, setRaw] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const complete = raw.length === CODE_LEN;
  const value = useMemo(() => display(raw), [raw]);

  // Check the code before they commit to it, so a typo shows up as "we don't
  // recognise that" rather than as a failed redeem.
  useEffect(() => {
    if (!complete) return setPreview(null);
    let live = true;
    const t = setTimeout(() => {
      api
        .get('/api/billing/gift-cards/peek', { params: { code: `BBOX-${value}` } })
        .then((r) => live && setPreview(r.data))
        .catch(() => live && setPreview(null));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [complete, value]);

  const redeem = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/api/billing/gift-cards/redeem', { code: `BBOX-${value}` });
      toast.success(data.message);
      setRaw('');
      setPreview(null);
      onRedeemed?.();
    } catch (err) {
      const body = err?.response?.data;
      toast.error(REASON_COPY[body?.reason] || body?.message || 'Could not redeem that code.');
    } finally {
      setBusy(false);
    }
  };

  const bad = preview && preview.valid === false;

  return (
    <div className="bb-card bb-liquid rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Gift className="w-3.5 h-3.5 shrink-0 text-[var(--bb-text-lo)]" strokeWidth={1.75} />
        <p className="text-[13px] font-semibold text-[var(--bb-text-hi)]">Redeem a gift card</p>
      </div>
      <p className="text-[12px] text-[var(--bb-text-lo)]">
        Got a code from someone? Enter it here and the credits land in your balance straight away.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-mono text-[var(--bb-text-dim)] pointer-events-none select-none">
            BBOX-
          </span>
          <input
            value={value}
            onChange={(e) => setRaw(tidy(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && complete && !busy && redeem()}
            placeholder="XXXX-XXXX-XXXX"
            aria-label="Gift card code"
            autoComplete="off"
            spellCheck={false}
            className={`bb-panel w-full h-10 pl-[62px] pr-3 text-[13px] font-mono tracking-wider uppercase
              text-[var(--bb-text-hi)] placeholder:text-[var(--bb-text-dim)] placeholder:tracking-wider
              focus:outline-none ${bad ? 'border-red-500/40' : ''}`}
          />
        </div>
        <button
          onClick={redeem}
          disabled={!complete || busy || bad}
          className="bb-btn flex items-center justify-center gap-2 h-10 px-5 shrink-0 rounded-full bg-[var(--bb-accent)] text-[#09090b] hover:bg-[var(--bb-accent-hot)] text-[13px] font-semibold disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {busy ? 'Redeeming…' : 'Redeem'}
        </button>
      </div>

      {preview?.valid && (
        <p className="flex items-center gap-1.5 text-[12px] text-[var(--bb-accent-hot)] mt-2.5">
          <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
          Worth <span className="font-mono">{fmt(preview.credits)}</span> credits (${preview.amountUsd}).
        </p>
      )}
      {bad && (
        <p className="flex items-center gap-1.5 text-[12px] text-red-400 mt-2.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
          {REASON_COPY[preview.reason] || 'That code cannot be used.'}
        </p>
      )}
    </div>
  );
}
