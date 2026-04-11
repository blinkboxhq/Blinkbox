import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Plus, Inbox, ChevronDown, Info } from 'lucide-react';

const POLL_INTERVALS = [
  { label: 'Every minute',     value: '* * * * *' },
  { label: 'Every 2 minutes',  value: '*/2 * * * *' },
  { label: 'Every 5 minutes',  value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
];

const PRESET_HOSTS = [
  { label: 'Gmail',           value: 'imap.gmail.com',     port: 993 },
  { label: 'Outlook / Hotmail', value: 'outlook.office365.com', port: 993 },
  { label: 'Yahoo Mail',      value: 'imap.mail.yahoo.com', port: 993 },
  { label: 'iCloud Mail',     value: 'imap.mail.me.com',   port: 993 },
  { label: 'Custom IMAP',     value: '',                   port: 993 },
];

export default function ImapTriggerNode({ config = {}, updateConfig, selected }) {
  const [activeTab, setActiveTab] = useState('setup');

  const preset = config.imapPreset || 'imap.gmail.com';
  const host = config.imapHost || preset || '';
  const port = config.imapPort || 993;
  const user = config.imapUser || '';
  const pollInterval = config.pollInterval || '*/5 * * * *';
  const mailbox = config.mailbox || 'INBOX';
  const onlyUnread = config.onlyUnread ?? true;
  const markRead = config.markRead ?? true;
  const isCustom = preset === '';

  const applyPreset = (val) => {
    const found = PRESET_HOSTS.find((p) => p.value === val);
    updateConfig?.('imapPreset', val);
    updateConfig?.('imapHost', val);
    if (found) updateConfig?.('imapPort', found.port);
  };

  return (
    <div className={`relative flex flex-col w-[280px] bg-[#0A0A0A] rounded-xl border transition-colors shadow-2xl font-sans group ${selected ? 'border-cyan-500/50' : 'border-[#2A2A2A]'}`}>

      <Handle
        id="output"
        type="source"
        position={Position.Right}
        className="!w-5 !h-5 !flex items-center justify-center !bg-[#111111] !border !border-[#2A2A2A] !rounded-full !opacity-0 group-hover:!opacity-100 transition-all hover:!bg-cyan-500 hover:!border-cyan-500 text-zinc-500 hover:text-white shadow-xl z-50 cursor-crosshair"
        style={{ top: '20px', right: '-10px', transform: 'translateY(-50%)' }}
      >
        <Plus className="w-3 h-3 pointer-events-none" />
      </Handle>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <Inbox className="w-3 h-3 text-cyan-400" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Email Inbox (IMAP)</span>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'filters', 'payload'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">

        {activeTab === 'setup' && (
          <>
            {/* Provider preset */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Email Provider</label>
              <div className="relative">
                <select
                  value={preset}
                  onChange={(e) => applyPreset(e.target.value)}
                  className="w-full appearance-none bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer pr-7"
                >
                  {PRESET_HOSTS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
              </div>
            </div>

            {/* Custom host */}
            {isCustom && (
              <div className="flex gap-2">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">IMAP Host</label>
                  <input
                    value={host}
                    onChange={(e) => updateConfig?.('imapHost', e.target.value)}
                    placeholder="imap.example.com"
                    className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-cyan-500/50 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5 w-16">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Port</label>
                  <input
                    value={port}
                    type="number"
                    onChange={(e) => updateConfig?.('imapPort', Number(e.target.value))}
                    className="w-full bg-[#111] border border-[#222] rounded-md px-2 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-cyan-500/50 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Email Address</label>
              <input
                value={user}
                onChange={(e) => updateConfig?.('imapUser', e.target.value)}
                placeholder="you@gmail.com"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>

            {/* Password via credential hint */}
            <div className="p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
              <p className="text-[9px] text-zinc-500 leading-relaxed">
                Store your password or app-password in <span className="text-cyan-400 font-mono">Credentials</span> and reference it as <span className="font-mono text-zinc-400">{'{{ $credential.imapPassword }}'}</span>. For Gmail, use an App Password — not your account password.
              </p>
            </div>

            {/* Poll interval */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Check every</label>
              <div className="relative">
                <select
                  value={pollInterval}
                  onChange={(e) => updateConfig?.('pollInterval', e.target.value)}
                  className="w-full appearance-none bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer pr-7"
                >
                  {POLL_INTERVALS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
              </div>
            </div>
          </>
        )}

        {activeTab === 'filters' && (
          <>
            {/* Mailbox */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Mailbox / Folder</label>
              <input
                value={mailbox}
                onChange={(e) => updateConfig?.('mailbox', e.target.value)}
                placeholder="INBOX"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
              <p className="text-[9px] text-zinc-600">Use INBOX for the main inbox, or a folder name like "Work".</p>
            </div>

            {/* Only unread */}
            <div className="flex items-start gap-3 p-2.5 bg-[#111] border border-[#1e1e1e] rounded-lg">
              <div className="flex-1">
                <span className="text-[10px] font-bold text-zinc-300 block">Only unread emails</span>
                <span className="text-[9px] text-zinc-600 mt-0.5 block">Skip emails that have already been read.</span>
              </div>
              <div
                className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 mt-0.5 ${onlyUnread ? 'bg-cyan-500' : 'bg-zinc-700'}`}
                onClick={() => updateConfig?.('onlyUnread', !onlyUnread)}
              >
                <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${onlyUnread ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Mark as read after processing */}
            <div className="flex items-start gap-3 p-2.5 bg-[#111] border border-[#1e1e1e] rounded-lg">
              <div className="flex-1">
                <span className="text-[10px] font-bold text-zinc-300 block">Mark as read after processing</span>
                <span className="text-[9px] text-zinc-600 mt-0.5 block">Prevent re-processing the same email next poll.</span>
              </div>
              <div
                className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 mt-0.5 ${markRead ? 'bg-cyan-500' : 'bg-zinc-700'}`}
                onClick={() => updateConfig?.('markRead', !markRead)}
              >
                <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${markRead ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
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
                ['$trigger.email.from', 'Sender address'],
                ['$trigger.email.to', 'Recipient address(es)'],
                ['$trigger.email.subject', 'Email subject'],
                ['$trigger.email.text', 'Plain text body'],
                ['$trigger.email.html', 'HTML body'],
                ['$trigger.email.date', 'Received date (ISO)'],
                ['$trigger.email.messageId', 'Message-ID header'],
                ['$trigger.email.attachments', 'Array of attachment objects'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono text-cyan-400 shrink-0">{key}</span>
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
