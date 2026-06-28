import { useState } from 'react';
import { Mail, Copy, Check, Lock, ChevronDown } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../../../../lib/api';

const PROVIDERS = [
  {
    value: 'mailgun',
    label: 'Mailgun',
    url: 'https://app.mailgun.com/mg/receiving',
    steps: [
      'Go to Mailgun → Receiving → Create Route',
      'Set filter: match_recipient("your@domain.com")',
      'Set action: forward to the URL below',
      'Save the route',
    ],
  },
  {
    value: 'sendgrid',
    label: 'SendGrid Inbound Parse',
    url: 'https://app.sendgrid.com/settings/parse',
    steps: [
      'Go to SendGrid → Settings → Inbound Parse',
      'Click "Add Host & URL"',
      'Set your MX domain and paste the URL below',
      'SendGrid POSTs a multipart form with from/subject/text/html',
    ],
  },
  {
    value: 'postmark',
    label: 'Postmark',
    url: 'https://account.postmarkapp.com/servers',
    steps: [
      'Go to Postmark → Server → Message Streams → Inbound',
      'Set the Webhook URL to the URL below',
      'Postmark POSTs JSON with From, Subject, TextBody, HtmlBody',
    ],
  },
  {
    value: 'forwardemail',
    label: 'Forward Email',
    url: 'https://forwardemail.net',
    steps: [
      'Go to forwardemail.net → My Account → Domains',
      'Add a webhook alias pointing to the URL below',
      'Free tier supports webhook forwarding out of the box',
    ],
  },
];

export default function EmailTriggerNode({ config = {}, updateConfig, nodeId }) {
  const { id: automationId } = useParams();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('setup');

  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const provider = config.emailProvider || 'mailgun';
  const authEnabled = config.authEnabled ?? false;
  const selectedProvider = PROVIDERS.find((p) => p.value === provider) || PROVIDERS[0];

  const copy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <Mail className="w-3 h-3 text-white" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Email Received</span>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'security'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-violet-500 text-violet-400' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">

        {activeTab === 'setup' && (
          <>
            {/* Provider picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Email Provider</label>
              <div className="relative">
                <select
                  value={provider}
                  onChange={(e) => updateConfig?.('emailProvider', e.target.value)}
                  className="w-full appearance-none bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500/50 transition-colors cursor-pointer pr-7"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
              </div>
            </div>

            {/* Webhook URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Inbound Webhook URL</label>
              <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded-lg px-2.5 py-2">
                <span className="flex-1 text-[10px] text-zinc-400 font-mono truncate select-all">{webhookUrl}</span>
                <button onClick={copy} className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">
                  {copied ? <Check className="w-3 h-3 text-violet-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Setup steps */}
            <div className="flex flex-col gap-2 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Setup Steps</span>
              {selectedProvider.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[9px] font-bold text-violet-500 shrink-0 mt-0.5">{i + 1}.</span>
                  <span className="text-[10px] text-zinc-500 leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'security' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 p-2.5 bg-[#111] border border-[#1e1e1e] rounded-lg">
              <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[10px] font-bold text-zinc-300 block">Require Bearer Token</span>
                <span className="text-[9px] text-zinc-600 mt-0.5 block leading-relaxed">
                  Only requests with the correct token are accepted
                </span>
              </div>
              <div
                className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 mt-0.5 ${authEnabled ? 'bg-violet-500' : 'bg-zinc-700'}`}
                onClick={() => updateConfig?.('authEnabled', !authEnabled)}
              >
                <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${authEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>

            {authEnabled && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Secret Token</label>
                <input
                  type="password"
                  value={config.secret || ''}
                  onChange={(e) => updateConfig?.('secret', e.target.value)}
                  placeholder="Paste a strong secret…"
                  className="w-full bg-[#111111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/50 transition-colors font-mono"
                />
                <p className="text-[9px] text-zinc-600">
                  Add this as a custom header in your email provider's webhook config: <span className="font-mono text-zinc-500">Authorization: Bearer &lt;token&gt;</span>
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
