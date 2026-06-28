import { useState } from 'react';
import { Copy, Check, Lock, Webhook, Zap, ShieldCheck } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '@/lib/api';
import { ConfigSection, ConfigLabel, ConfigInput, ConfigSelect, ConfigPills } from '@/components/ui/ConfigKit';

const ACCENT = '#6f97e8';
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const TABS = [
  { id: 'setup', label: 'Setup' },
  { id: 'security', label: 'Security' },
];
const PAYLOAD_VARS = ['$trigger.body', '$trigger.query', '$trigger.headers', '$trigger.method'];

function Toggle({ on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-9 h-5 rounded-full p-0.5 transition-colors shrink-0"
      style={{ backgroundColor: on ? ACCENT : '#3b3b3b' }}
    >
      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

function SwitchRow({ icon: Icon, title, desc, on, onToggle }) {
  return (
    <div className="bb-glow-border flex items-start gap-3 p-3 rounded-md bg-[#0f0f0f] border border-[#2b2b2b]">
      <Icon className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-semibold text-neutral-200 font-mono block">{title}</span>
        <span className="text-[9px] text-neutral-600 mt-1 block leading-relaxed font-mono">{desc}</span>
      </div>
      <Toggle on={on} onClick={onToggle} />
    </div>
  );
}

export default function WebhookTriggerNode({ config = {}, updateConfig }) {
  const { id: automationId } = useParams();
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('setup');

  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const allowedMethods = config.allowedMethods || ['POST'];
  const authEnabled = config.authEnabled ?? false;
  const syncMode = config.syncMode ?? false;
  const activeUrl = syncMode ? `${webhookUrl}?wait=true` : webhookUrl;

  const copy = () => {
    navigator.clipboard.writeText(activeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const toggleMethod = (m) => {
    if (allowedMethods.includes(m)) {
      if (allowedMethods.length === 1) return;
      updateConfig?.('allowedMethods', allowedMethods.filter((x) => x !== m));
    } else {
      updateConfig?.('allowedMethods', [...allowedMethods, m]);
    }
  };

  return (
    <ConfigSection className="gap-5">
      {/* Header */}
      <div className="bb-glow-border flex items-center gap-3 p-4 rounded-md bg-[#0f0f0f] border border-[#3b3b3b]">
        <div className="w-9 h-9 rounded-md bg-[#262626] border border-[#3b3b3b] flex items-center justify-center shrink-0" style={{ color: ACCENT }}>
          <Webhook className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-bold text-neutral-100 font-mono tracking-wide">Webhook</span>
          <span className="text-[10px] text-neutral-500 font-mono">Trigger this workflow with an HTTP call</span>
        </div>
        {syncMode && (
          <span className="ml-auto text-[8px] font-bold uppercase tracking-[0.18em] font-mono px-2 py-1 rounded border" style={{ color: ACCENT, backgroundColor: `${ACCENT}1f`, borderColor: `${ACCENT}66` }}>Sync</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 -mt-1">
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="flex-1 py-2 text-[9px] font-bold uppercase tracking-[0.18em] font-mono rounded-md border transition-colors"
              style={on
                ? { color: ACCENT, backgroundColor: `${ACCENT}1f`, borderColor: `${ACCENT}66` }
                : { color: '#6d6d6d', backgroundColor: '#0f0f0f', borderColor: '#2b2b2b' }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'setup' && (
        <>
          {/* URL */}
          <div className="flex flex-col">
            <ConfigLabel>Your Webhook URL</ConfigLabel>
            <div className="bb-glow-border flex items-center gap-2 bg-[#0f0f0f] border border-[#3b3b3b] rounded-md px-3 py-2.5">
              <span className="flex-1 text-[11px] text-neutral-300 font-mono truncate select-all">{activeUrl}</span>
              <button type="button" onClick={copy} className="text-neutral-600 hover:text-neutral-200 transition-colors shrink-0" title="Copy URL">
                {copied ? <Check className="w-3.5 h-3.5" style={{ color: ACCENT }} /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Methods */}
          <ConfigPills
            label="Accept Methods"
            value={null}
            onChange={toggleMethod}
            options={METHODS.map((m) => ({ value: m, label: m }))}
            accentColor={ACCENT}
            multi={allowedMethods}
          />

          {/* Sync mode */}
          <SwitchRow
            icon={Zap}
            title="Wait For Response"
            desc="Holds the connection open until the workflow finishes, then returns its output."
            on={syncMode}
            onToggle={() => updateConfig?.('syncMode', !syncMode)}
          />

          {/* Payload vars */}
          <div className="flex flex-col gap-2 p-3 rounded-md bg-[#0f0f0f] border border-[#2b2b2b]">
            <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.18em] font-mono">Available In Workflow As</span>
            {PAYLOAD_VARS.map((v) => (
              <span key={v} className="text-[10px] font-mono" style={{ color: ACCENT }}>{v}</span>
            ))}
          </div>
        </>
      )}

      {tab === 'security' && (
        <>
          {/* Bearer */}
          <SwitchRow
            icon={Lock}
            title="Require Bearer Token"
            desc="Callers must pass Authorization: Bearer <secret>."
            on={authEnabled}
            onToggle={() => updateConfig?.('authEnabled', !authEnabled)}
          />
          {authEnabled && (
            <ConfigInput
              label="Secret Token"
              type="password"
              value={config.secret || ''}
              onChange={(v) => updateConfig?.('secret', v)}
              placeholder="Paste a strong secret…"
              hint="// requests without it are rejected with 401"
            />
          )}

          {/* HMAC */}
          <SwitchRow
            icon={ShieldCheck}
            title="HMAC Signature Verification"
            desc="Verify the webhook came from a trusted source (GitHub / Stripe style)."
            on={!!config.hmacEnabled}
            onToggle={() => updateConfig?.('hmacEnabled', !config.hmacEnabled)}
          />
          {config.hmacEnabled && (
            <div className="flex flex-col gap-4">
              <ConfigInput
                label="HMAC Secret"
                type="password"
                value={config.hmacSecret || ''}
                onChange={(v) => updateConfig?.('hmacSecret', v)}
                placeholder="Shared secret from provider…"
              />
              <ConfigSelect
                label="Algorithm"
                value={config.hmacAlgorithm || 'sha256'}
                onChange={(v) => updateConfig?.('hmacAlgorithm', v)}
                options={[
                  { value: 'sha256', label: 'SHA-256' },
                  { value: 'sha1', label: 'SHA-1 (legacy)' },
                  { value: 'sha512', label: 'SHA-512' },
                ]}
                accentColor={ACCENT}
              />
              <ConfigInput
                label="Signature Header"
                value={config.hmacHeader || 'x-hub-signature-256'}
                onChange={(v) => updateConfig?.('hmacHeader', v)}
                hint="// requests with invalid or missing signatures are rejected with 401"
              />
            </div>
          )}
        </>
      )}
    </ConfigSection>
  );
}
