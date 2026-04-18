import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Plus, Copy, Check, Info } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../../../../lib/api';

export default function TypeformTriggerNode({ config = {}, updateConfig, selected }) {
  const { id: automationId } = useParams();
  const [activeTab, setActiveTab] = useState('setup');
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${API_URL}/webhook/${automationId}`;

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={`relative flex flex-col w-[280px] bg-[#0A0A0A] rounded-xl border transition-colors shadow-2xl font-sans group ${selected ? 'border-[#262627]/80' : 'border-[#2A2A2A]'}`}>
      <Handle id="output" type="source" position={Position.Right}
        className="!w-5 !h-5 !flex items-center justify-center !bg-[#111111] !border !border-[#2A2A2A] !rounded-full !opacity-0 group-hover:!opacity-100 transition-all hover:!bg-zinc-400 hover:!border-zinc-400 text-zinc-500 hover:text-white shadow-xl z-50 cursor-crosshair"
        style={{ top: '20px', right: '-10px', transform: 'translateY(-50%)' }}>
        <Plus className="w-3 h-3 pointer-events-none" />
      </Handle>

      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <span className="text-[10px] font-black text-zinc-300">T</span>
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Typeform</span>
        <span className="ml-auto text-[9px] font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">TRIGGER</span>
      </div>

      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'payload'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-zinc-400 text-zinc-300' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">
        {activeTab === 'setup' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Webhook URL</label>
              <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded-lg px-2.5 py-2">
                <span className="flex-1 text-[10px] text-zinc-400 font-mono truncate select-all">{webhookUrl}</span>
                <button onClick={() => copy(webhookUrl)} className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">
                  {copied ? <Check className="w-3 h-3 text-zinc-300" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <p className="text-[9px] text-zinc-600">Add in Typeform → Connect → Webhooks → Add Webhook.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Form ID</label>
              <input value={config.formId || ''}
                onChange={(e) => updateConfig?.('formId', e.target.value)}
                placeholder="abc12345"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-500/50 transition-colors"
              />
              <p className="text-[9px] text-zinc-600">From the form URL: typeform.com/to/<span className="font-mono text-zinc-500">FORM_ID</span></p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Webhook Secret</label>
              <input type="password" value={config.typeformWebhookSecret || ''}
                onChange={(e) => updateConfig?.('typeformWebhookSecret', e.target.value)}
                placeholder="Set in Typeform webhook settings"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-500/50 transition-colors"
              />
              <p className="text-[9px] text-zinc-600">BlinkBox verifies <span className="font-mono text-zinc-500">Typeform-Signature</span> (sha256=base64 HMAC).</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Personal Access Token (optional)</label>
              <input type="password" value={config.apiKey || ''}
                onChange={(e) => updateConfig?.('apiKey', e.target.value)}
                placeholder="For auto-registering the webhook"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-500/50 transition-colors"
              />
            </div>
          </>
        )}

        {activeTab === 'payload' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Info className="w-3 h-3 text-zinc-600" />
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Available in workflow as</span>
            </div>
            <div className="flex flex-col gap-1 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
              {[
                ['$trigger.body.event_id', 'Unique submission event ID'],
                ['$trigger.body.event_type', '"form_response" (always)'],
                ['$trigger.body.form_response.form_id', 'The form ID'],
                ['$trigger.body.form_response.token', 'Response token (unique per submission)'],
                ['$trigger.body.form_response.submitted_at', 'Submission timestamp (ISO)'],
                ['$trigger.body.form_response.answers', 'Array of answers'],
                ['$trigger.body.form_response.answers[0].text', 'First answer text value'],
                ['$trigger.body.form_response.hidden', 'Hidden fields object'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono text-zinc-300 shrink-0">{key}</span>
                  <span className="text-[9px] text-zinc-600">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
