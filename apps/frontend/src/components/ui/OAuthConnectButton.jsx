import { useState, useEffect, useCallback, useRef } from 'react';
import { Link2, Loader2, CheckCircle2, AlertCircle, Unlink } from 'lucide-react';
import { API_URL } from '../../lib/api';
import useCredentialsStore from '../../store/credentialsStore';

/**
 * OAuthConnectButton — opens an OAuth popup for a given provider.
 *
 * Props:
 *   provider      — "slack" | "airtable" | "meta"
 *   providerLabel — Display name (e.g. "Slack", "Airtable", "WhatsApp")
 *   accentColor   — Tailwind color stem (e.g. "purple", "yellow", "green")
 *   value         — current credentialId (if already connected)
 *   onChange      — (credentialId: string) => void
 *   icon          — optional icon component
 */
export default function OAuthConnectButton({
  provider,
  providerLabel,
  accentColor = 'blue',
  value,
  onChange,
  icon: IconComponent,
}) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const credentials = useCredentialsStore((s) => s.credentials);
  const ensureFresh = useCredentialsStore((s) => s.ensureFresh);
  const upsertCredential = useCredentialsStore((s) => s.upsert);

  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });
  const hasAutoSelected = useRef(false);

  useEffect(() => { ensureFresh(); }, [ensureFresh]);

  const connectedCred = value ? credentials.find((c) => c._id === value) || null : null;

  // Auto-select first matching credential when none chosen yet
  useEffect(() => {
    if (value || !provider || hasAutoSelected.current) return;
    const match = credentials.find((c) => c.type === 'oauth' && c.provider === provider);
    if (match) {
      hasAutoSelected.current = true;
      onChangeRef.current(match._id);
    }
  }, [value, provider, credentials]);

  // Listen for postMessage from OAuth popup
  const handleMessage = useCallback(
    (event) => {
      const apiOrigin = new URL(API_URL).origin;
      if (event.origin !== apiOrigin) return;
      const data = event.data;
      if (data?.type !== 'blinkbox:oauth') return;

      const payload = data.payload;
      setIsConnecting(false);

      if (payload?.error) {
        setError(payload.error);
        return;
      }

      if (payload?.success && payload?.credential?._id) {
        setError(null);
        upsertCredential(payload.credential);
        onChange(payload.credential._id);
      }
    },
    [onChange, upsertCredential],
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  const handleConnect = () => {
    setError(null);
    setIsConnecting(true);

    const token = localStorage.getItem('blinkbox_token');
    if (!token) {
      setError('Not authenticated. Please log in again.');
      setIsConnecting(false);
      return;
    }

    const url = `${API_URL}/api/oauth/${provider}/authorize?token=${encodeURIComponent(token)}`;
    const w = 600;
    const h = 700;
    const left = window.screenX + (window.innerWidth - w) / 2;
    const top = window.screenY + (window.innerHeight - h) / 2;

    const popup = window.open(
      url,
      `blinkbox_oauth_${provider}`,
      `width=${w},height=${h},left=${left},top=${top},popup=1`,
    );

    // Poll for popup close (user closed without completing)
    const interval = setInterval(() => {
      if (popup?.closed) {
        clearInterval(interval);
        setIsConnecting(false);
      }
    }, 500);
  };

  const handleDisconnect = () => {
    onChange('');
  };

  const isConnected = !!value && !!connectedCred;

  if (isConnected) {
    return (
      <div className="flex flex-col gap-2">
        <div className={`flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg`}>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-emerald-400">
                {providerLabel} Connected
              </span>
              <span className="text-[10px] text-zinc-500 truncate max-w-[180px]">
                {connectedCred.name}
              </span>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
            title="Disconnect"
          >
            <Unlink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className={`flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            {IconComponent ? (
              <IconComponent className="w-4 h-4" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            Connect {providerLabel}
          </>
        )}
      </button>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 bg-red-500/5 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-red-300 leading-relaxed">{error}</p>
        </div>
      )}
    </div>
  );
}
