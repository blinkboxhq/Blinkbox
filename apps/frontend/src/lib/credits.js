/**
 * Credit ↔ dollar formatting, shared by every surface that shows a balance.
 * The rate mirrors PAYG_CREDITS_PER_USD on the backend; the API sends the live
 * value on every usage payload, so this is only the offline fallback.
 */
export const CREDITS_PER_USD = 1024;

export const fmtCredits = (n) => (typeof n === 'number' ? n.toLocaleString() : '—');

export function creditsToUsd(credits, perUsd = CREDITS_PER_USD) {
  return Math.max(0, credits || 0) / (perUsd || CREDITS_PER_USD);
}

// Cents matter here — a 200-credit balance is 20¢, and rounding it to $0 reads
// as broken rather than nearly empty.
export function fmtUsd(amount) {
  return `$${Math.max(0, Number(amount) || 0).toFixed(2)}`;
}

export function creditsAsUsd(credits, perUsd) {
  return fmtUsd(creditsToUsd(credits, perUsd));
}
