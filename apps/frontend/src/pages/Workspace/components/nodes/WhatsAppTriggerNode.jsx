import { useState } from 'react';
import { Copy, Check, Info } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../../../../lib/api';
import imgWhatsApp from '../../../../assets/whatsapp.png';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

const PROVIDERS = [
  { value: 'twilio',  label: 'Twilio',       desc: 'WhatsApp Business via Twilio' },
  { value: 'meta',    label: 'Meta (Cloud)', desc: 'Meta WhatsApp Cloud API (direct)' },
];

export default function WhatsAppTriggerNode({ config = {}, updateConfig, nodeId }) {
  const { id: automationId } = useParams();
  const [activeTab, setActiveTab] = useState('setup');
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const provider = config.provider || 'twilio';

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <img src={imgWhatsApp} className="w-3 h-3 object-contain" alt="WhatsApp" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">WhatsApp</span>
        <span className="ml-auto text-[9px] font-bold text-[#25D366] bg-[#25D366]/10 border border-[#25D366]/20 px-1.5 py-0.5 rounded">TRIGGER</span>
      </div>

      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'payload'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-[#25D366] text-[#25D366]' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">
        {activeTab === 'setup' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Provider</label>
              <div className="flex flex-col gap-1">
                {PROVIDERS.map(({ value, label, desc }) => {
                  const on = provider === value;
                  return (
                    <button key={value} onClick={() => updateConfig?.('provider', value)}
                      className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-all ${on ? 'bg-[#25D366]/10 border-[#25D366]/30' : 'bg-[#0d0d0d] border-[#1a1a1a] hover:border-[#2a2a2a]'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full border mt-0.5 shrink-0 flex items-center justify-center transition-all ${on ? 'bg-[#25D366] border-[#25D366]' : 'border-zinc-600'}`}>
                        {on && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <div>
                        <span className={`text-[10px] font-semibold block ${on ? 'text-zinc-200' : 'text-zinc-500'}`}>{label}</span>
                        <span className="text-[9px] text-zinc-600">{desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Webhook URL</label>
              <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded-lg px-2.5 py-2">
                <span className="flex-1 text-[10px] text-zinc-400 font-mono truncate select-all">{webhookUrl}</span>
                <button onClick={() => copy(webhookUrl)} className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">
                  {copied ? <Check className="w-3 h-3 text-[#25D366]" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <p className="text-[9px] text-zinc-600">
                {provider === 'twilio'
                  ? 'Paste into Twilio → Messaging → WhatsApp number → When a message comes in.'
                  : 'Paste into Meta Developer Portal → WhatsApp → Configuration → Webhook URL.'}
              </p>
            </div>

            {provider === 'twilio' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <CredentialPicker
                    label="Twilio Auth Token"
                    value={config.twilioAuthToken || ''}
                    onChange={(v) => updateConfig?.('twilioAuthToken', v)}
                    placeholder="Select Twilio auth token credential…"
                  />
                  <p className="text-[9px] text-zinc-600">Used to verify the Twilio request signature.</p>
                </div>
              </>
            )}

            {provider === 'meta' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Verify Token</label>
                  <input value={config.metaVerifyToken || ''}
                    onChange={(e) => updateConfig?.('metaVerifyToken', e.target.value)}
                    placeholder="Any string — used during setup verification"
                    className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#25D366]/50 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CredentialPicker
                    label="App Secret"
                    value={config.metaAppSecret || ''}
                    onChange={(v) => updateConfig?.('metaAppSecret', v)}
                    placeholder="Select Meta app secret credential…"
                  />
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'payload' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Info className="w-3 h-3 text-zinc-600" />
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Available in workflow as</span>
            </div>
            {provider === 'twilio' ? (
              <div className="flex flex-col gap-1 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
                {[
                  ['$trigger.body.Body', 'Message text content'],
                  ['$trigger.body.From', 'Sender number (whatsapp:+1234567890)'],
                  ['$trigger.body.To', 'Your WhatsApp number'],
                  ['$trigger.body.NumMedia', 'Count of attached media files'],
                  ['$trigger.body.MediaUrl0', 'URL of first media attachment'],
                  ['$trigger.body.MediaContentType0', 'MIME type of first attachment'],
                  ['$trigger.body.AccountSid', 'Your Twilio account SID'],
                  ['$trigger.body.MessageSid', 'Unique message ID'],
                ].map(([key, desc]) => (
                  <div key={key} className="flex items-baseline gap-2">
                    <span className="text-[10px] font-mono text-[#25D366] shrink-0">{key}</span>
                    <span className="text-[9px] text-zinc-600">{desc}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
                {[
                  ['$trigger.body.entry[0].changes[0].value.messages[0].text.body', 'Message text'],
                  ['$trigger.body.entry[0].changes[0].value.messages[0].from', 'Sender phone number'],
                  ['$trigger.body.entry[0].changes[0].value.messages[0].id', 'Message ID'],
                  ['$trigger.body.entry[0].changes[0].value.messages[0].type', 'Message type (text/image/document)'],
                  ['$trigger.body.entry[0].changes[0].value.contacts[0].profile.name', 'Sender display name'],
                ].map(([key, desc]) => (
                  <div key={key} className="flex items-baseline gap-2">
                    <span className="text-[10px] font-mono text-[#25D366] shrink-0 break-all">{key}</span>
                    <span className="text-[9px] text-zinc-600 shrink-0">{desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
