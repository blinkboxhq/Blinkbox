import { useState } from 'react';
import { Copy, Check, Info } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '@/lib/api';
import CredentialPicker from '@/components/ui/CredentialPicker';

const LINEAR_EVENTS = [
  { value: 'Issue',             label: 'Issue Created / Updated', desc: 'Any issue event in the workspace' },
  { value: 'IssueLabel',       label: 'Issue Labeled',           desc: 'Label added or removed from issue' },
  { value: 'IssueAssignee',    label: 'Issue Assigned',          desc: 'Issue assignee changed' },
  { value: 'Comment',          label: 'Comment',                 desc: 'Comment created or updated' },
  { value: 'Project',          label: 'Project',                 desc: 'Project created or updated' },
  { value: 'Cycle',            label: 'Cycle',                   desc: 'Cycle started or completed' },
  { value: 'IssueSLA',         label: 'SLA Breach',              desc: 'Issue breached SLA policy' },
];

const ACTIONS = [
  { value: 'create', label: 'Created' },
  { value: 'update', label: 'Updated' },
  { value: 'remove', label: 'Removed' },
];

export default function LinearTriggerNode({ config = {}, updateConfig, nodeId }) {
  const { id: automationId } = useParams();
  const [activeTab, setActiveTab] = useState('setup');
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const selectedEvents = config.events || ['Issue'];
  const selectedActions = config.actions || ['create'];

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const toggleEvent = (val) => {
    const updated = selectedEvents.includes(val)
      ? selectedEvents.filter((e) => e !== val)
      : [...selectedEvents, val];
    updateConfig?.('events', updated.length ? updated : ['Issue']);
  };

  const toggleAction = (val) => {
    const updated = selectedActions.includes(val)
      ? selectedActions.filter((a) => a !== val)
      : [...selectedActions, val];
    updateConfig?.('actions', updated.length ? updated : ['create']);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <span className="text-[10px] font-black text-[#5E6AD2]">L</span>
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Linear</span>
        <span className="ml-auto text-[9px] font-bold text-[#5E6AD2] bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 px-1.5 py-0.5 rounded">TRIGGER</span>
      </div>

      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'events'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-[#5E6AD2] text-[#5E6AD2]' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>
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
                  {copied ? <Check className="w-3 h-3 text-[#5E6AD2]" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <p className="text-[9px] text-zinc-600">Add in Linear → Settings → API → Webhooks.</p>
            </div>

            <CredentialPicker
              value={config.linearWebhookSecret || ''}
              onChange={(id) => updateConfig?.('linearWebhookSecret', id)}
              accentColor="blue"
              label="Webhook Secret"
              credentialType="Linear"
              placeholder="Select Linear webhook secret..."
              hint="BlinkBox verifies the linear-signature header."
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Team ID (optional)</label>
              <input value={config.teamId || ''}
                onChange={(e) => updateConfig?.('teamId', e.target.value)}
                placeholder="Filter to specific team"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#5E6AD2]/50 transition-colors"
              />
            </div>
          </>
        )}

        {activeTab === 'events' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Resource Types</label>
              <div className="flex flex-col gap-1">
                {LINEAR_EVENTS.map(({ value, label, desc }) => {
                  const on = selectedEvents.includes(value);
                  return (
                    <button key={value} onClick={() => toggleEvent(value)}
                      className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-all ${on ? 'bg-[#5E6AD2]/10 border-[#5E6AD2]/30' : 'bg-[#0d0d0d] border-[#1a1a1a] hover:border-[#2a2a2a]'}`}>
                      <div className={`w-3.5 h-3.5 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-all ${on ? 'bg-[#5E6AD2] border-[#5E6AD2]' : 'border-zinc-600'}`}>
                        {on && <div className="w-1.5 h-1 bg-white rounded-sm" />}
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
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Actions</label>
              <div className="flex gap-2">
                {ACTIONS.map(({ value, label }) => {
                  const on = selectedActions.includes(value);
                  return (
                    <button key={value} onClick={() => toggleAction(value)}
                      className={`flex-1 py-2 rounded-lg border text-[10px] font-bold transition-all ${on ? 'bg-[#5E6AD2]/10 border-[#5E6AD2]/40 text-[#5E6AD2]' : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
