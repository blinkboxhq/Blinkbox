import { useState } from 'react';
import { Info } from 'lucide-react';
import logo from './logo.svg';

export default function SentryTriggerNode({ config = {}, updateConfig }) {
  const [tab, setTab] = useState('setup');
  const accent = '#A78BFA';

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <img src={logo} className="w-3 h-3 object-contain" alt="Sentry" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Sentry</span>
        <div className="ml-auto">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
            style={{ color: accent, background: accent + '18', borderColor: accent + '33' }}>TRIGGER</span>
        </div>
      </div>

      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'options', 'payload'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${tab === t ? 'border-b-2' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
            style={tab === t ? { color: accent, borderColor: accent } : {}}>
            {t}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">
        {tab === 'setup' && (
          <>
            <div className="p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
              <p className="text-[9px] text-zinc-400 leading-relaxed">
                In Sentry → Settings → Integrations → Webhooks, add your BlinkBox URL.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Client Secret</label>
              <input value={config.clientSecret || ''} onChange={e => updateConfig?.('clientSecret', e.target.value)}
                placeholder="sentry webhook secret" type="password" className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none transition-colors" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Organization Slug</label>
              <input value={config.orgSlug || ''} onChange={e => updateConfig?.('orgSlug', e.target.value)}
                placeholder="my-org" className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none transition-colors" />
            </div>
          </>
        )}
        {tab === 'options' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Event Filter</label>
            <select value={config.event || 'all'} onChange={e => updateConfig?.('event', e.target.value)}
              className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer">
              <option value="all">All events</option>
              <option value="event_alert">Event alert</option>
              <option value="issue_alert">Issue alert</option>
              <option value="metric_alert">Metric alert</option>
            </select>
          </div>
        )}
        {tab === 'payload' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Info className="w-3 h-3 text-zinc-600" />
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Available in workflow</span>
            </div>
            <div className="flex flex-col gap-1 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
              {[['$trigger.action','Alert action'],['$trigger.issueId','Issue ID'],['$trigger.issueTitle','Issue title'],['$trigger.level','Severity level'],['$trigger.project','Sentry project'],['$trigger.environment','Environment'],['$trigger.url','Sentry issue URL'],['$trigger.firstSeen','First occurrence time']].map(([k,d]) => (
                <div key={k} className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono shrink-0" style={{ color: accent }}>{k}</span>
                  <span className="text-[9px] text-zinc-600">{d}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
