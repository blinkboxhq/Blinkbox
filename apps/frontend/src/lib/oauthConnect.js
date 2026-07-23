/**
 * OAUTH POPUP CONNECT — one mechanism, three delivery channels.
 *
 * A popup cannot always reach the window that opened it (a COOP header, a
 * browser that blanks opener, the user closing it early), and when it could
 * not, the app used to sit there looking disconnected even though the
 * credential had already been saved. So delivery is redundant — whichever
 * channel arrives first wins and the rest are ignored:
 *
 *   1. postMessage from the popup    — instant
 *   2. socket `credential:created`   — survives a detached opener
 *   3. refresh when the popup closes — last resort if the socket is down
 *
 * Every "Sign in with X" in the app goes through here, so no provider can
 * drift into its own half-working copy of this.
 */

import useCredentialsStore from '../store/credentialsStore';
import { API_URL } from './api';

const MESSAGE_TYPES = ['blinkbox:oauth', 'blinkbox:mcp-oauth'];
const CLOSE_GRACE_MS = 1200;

export function oauthAuthorizeUrl(provider) {
  const token = localStorage.getItem('blinkbox_token');
  if (!token) return null;
  return `${API_URL}/api/oauth/${provider}/authorize?token=${encodeURIComponent(token)}`;
}

/**
 * Opens `url` in a popup and resolves the credential it produces.
 * Returns a cancel function that tears down every listener.
 */
export function openOAuthPopup({
  url,
  name = 'blinkbox_oauth',
  width = 600,
  height = 700,
  match,
  onCredential,
  onError,
  onSettled,
}) {
  const store = useCredentialsStore.getState();
  store.ensureFresh();

  const seen = new Set(store.credentials.map((c) => c._id));
  const accepts = (c) => !!c?._id && !seen.has(c._id) && (!match || match(c));

  let settled = false;
  let unsubStore = null;
  let closeTimer = null;
  let pollTimer = null;

  const cleanup = () => {
    window.removeEventListener('message', onMessage);
    unsubStore?.();
    clearInterval(pollTimer);
    clearTimeout(closeTimer);
  };

  const succeed = (credential) => {
    if (settled) return;
    settled = true;
    cleanup();
    useCredentialsStore.getState().upsert(credential);
    onCredential?.(credential);
    onSettled?.();
  };

  const fail = (message) => {
    if (settled) return;
    settled = true;
    cleanup();
    onError?.(message);
    onSettled?.();
  };

  // 1 — the popup talking straight back to us.
  function onMessage(e) {
    if (!MESSAGE_TYPES.includes(e.data?.type)) return;
    try {
      if (e.origin !== new URL(API_URL, window.location.href).origin) return;
    } catch {
      return;
    }
    const payload = e.data.payload;
    if (payload?.error) return fail(payload.error);
    if (payload?.success && payload?.credential?._id) succeed(payload.credential);
  }
  window.addEventListener('message', onMessage);

  // 2 — the store, fed by the server's `credential:created` socket event. Also
  // catches the refresh in step 3, so both land through one subscription.
  unsubStore = useCredentialsStore.subscribe((state, prev) => {
    if (settled || state.credentials === prev.credentials) return;
    const fresh = state.credentials.find(accepts);
    if (fresh) succeed(fresh);
  });

  const w = window.open(
    url,
    name,
    `width=${width},height=${height},left=${window.screenX + (window.innerWidth - width) / 2},top=${window.screenY + (window.innerHeight - height) / 2},scrollbars=yes,resizable=yes`,
  );

  if (!w) {
    fail('Your browser blocked the sign-in window. Allow pop-ups for this site and try again.');
    return () => {};
  }

  // 3 — the popup is gone and neither channel fired. It may still have worked
  // (a detached opener with the socket down), so ask the server directly.
  pollTimer = setInterval(() => {
    if (!w.closed || settled) return;
    clearInterval(pollTimer);
    closeTimer = setTimeout(async () => {
      if (settled) return;
      await useCredentialsStore.getState().refresh();
      if (settled) return;
      const fresh = useCredentialsStore.getState().credentials.find(accepts);
      if (fresh) succeed(fresh);
      else fail(null);
    }, CLOSE_GRACE_MS);
  }, 400);

  return () => {
    if (settled) return;
    settled = true;
    cleanup();
  };
}
