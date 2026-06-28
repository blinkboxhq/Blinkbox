import { useState } from 'react';
import { MessageSquare, Copy, Check, Bot, Lock } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '@/lib/api';
import { ConfigSection, ConfigLabel, ConfigInput } from '@/components/ui/ConfigKit';

const ACCENT = '#e8729f';
const TABS = [
  { id: 'setup', label: 'Setup' },
  { id: 'prompt', label: 'Prompt' },
  { id: 'security', label: 'Security' },
];

export default function ChatTriggerNode({ config = {}, updateConfig }) {
  const { id: automationId } = useParams();
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('setup');

  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const systemPrompt = config.systemPrompt || '';
  const sessionIdField = config.sessionIdField || 'sessionId';
  const authEnabled = config.authEnabled ?? false;

  const copy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const examplePayload = `{
  "message": "What's the weather?",
  "${sessionIdField}": "user_abc123"
}`;

  return (
    <ConfigSection className="gap-5">
      {/* Header */}
      <div className="bb-glow-border flex items-center gap-3 p-4 rounded-md bg-[#0f0f0f] border border-[#3b3b3b]">
        <div className="w-9 h-9 rounded-md bg-[#262626] border border-[#3b3b3b] flex items-center justify-center shrink-0 text-white">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-bold text-neutral-100 font-mono tracking-wide">Chat Message</span>
          <span className="text-[10px] text-neutral-500 font-mono">Trigger from a chat / conversation message</span>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[9px] font-mono px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shrink-0">
          <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
          Live Chat
        </span>
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
            <ConfigLabel>Endpoint URL</ConfigLabel>
            <div className="bb-glow-border flex items-center gap-2 bg-[#0f0f0f] border border-[#3b3b3b] rounded-md px-3 py-2.5">
              <span className="flex-1 text-[11px] text-neutral-300 font-mono truncate select-all">{webhookUrl}</span>
              <button type="button" onClick={copy} className="text-neutral-600 hover:text-neutral-200 transition-colors shrink-0" title="Copy URL">
                {copied ? <Check className="w-3.5 h-3.5" style={{ color: ACCENT }} /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Session ID field */}
          <ConfigInput
            label="Session ID Field"
            value={sessionIdField}
            onChange={(v) => updateConfig?.('sessionIdField', v)}
            placeholder="sessionId"
            hint="// groups messages from one user into a conversation thread"
          />

          {/* Expected payload */}
          <div className="flex flex-col">
            <ConfigLabel>Expected Payload</ConfigLabel>
            <pre className="text-[10px] font-mono text-neutral-400 bg-[#0f0f0f] border border-[#2b2b2b] rounded-md p-3 leading-relaxed whitespace-pre-wrap">{examplePayload}</pre>
          </div>

          {/* Available variables */}        </>
      )}

      {tab === 'prompt' && (
        <div className="flex flex-col">
          <ConfigLabel icon={Bot}>System Prompt</ConfigLabel>
          <textarea
            value={systemPrompt}
            onChange={(e) => updateConfig?.('systemPrompt', e.target.value)}
            placeholder="You are a helpful assistant. Answer the user's question clearly and concisely."
            rows={6}
            className="bb-glow-border w-full bg-[#0f0f0f] border border-[#3b3b3b] rounded-md px-3 py-2.5 text-[12.5px] text-neutral-100 font-mono outline-none transition-colors focus:border-[#545454] resize-none leading-relaxed placeholder-neutral-600"
          />
          <p className="text-[9px] text-neutral-600 mt-1.5 font-mono tracking-wide leading-relaxed">
            // reference as {'{{ $trigger.systemPrompt }}'} in any AI node
          </p>
        </div>
      )}

      {tab === 'security' && (
        <>
          <div className="bb-glow-border flex items-start gap-3 p-3 rounded-md bg-[#0f0f0f] border border-[#2b2b2b]">
            <Lock className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-neutral-200 font-mono block">Require Bearer Token</span>
              <span className="text-[9px] text-neutral-600 mt-1 block leading-relaxed font-mono">Only your app can call this trigger.</span>
            </div>
            <button
              type="button"
              onClick={() => updateConfig?.('authEnabled', !authEnabled)}
              className="w-9 h-5 rounded-full p-0.5 transition-colors shrink-0"
              style={{ backgroundColor: authEnabled ? ACCENT : '#3b3b3b' }}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${authEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
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
        </>
      )}
    </ConfigSection>
  );
}
