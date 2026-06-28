import { useState } from 'react';
import { Info } from 'lucide-react';
import logo from './logo.svg';

export default function SharePointTriggerNode({ config = {}, updateConfig }) {
  const [tab, setTab] = useState('setup');
  const accent = '#0078D4';

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <img src={logo} className="w-3 h-3 object-contain" alt="SharePoint" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">SharePoint</span>
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
                Microsoft Graph subscriptions push SharePoint list changes to your BlinkBox URL.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Site URL</label>
              <input value={config.siteUrl || ''} onChange={e => updateConfig?.('siteUrl', e.target.value)}
                placeholder="https://contoso.sharepoint.com/sites/mysite" className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none transition-colors" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">List Name</label>
              <input value={config.listName || ''} onChange={e => updateConfig?.('listName', e.target.value)}
                placeholder="list name to watch" className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none transition-colors" />
            </div>
          </>
        )}
        {tab === 'options' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Change Type Filter</label>
            <select value={config.changeType || 'all'} onChange={e => updateConfig?.('changeType', e.target.value)}
              className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer">
              <option value="all">All changes</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
            </select>
          </div>
        )}
        {tab === 'payload' && (
          <div className="flex flex-col gap-1.5">            <div className="flex flex-col gap-1 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
              {[['$trigger.siteId','SharePoint site ID'],['$trigger.listId','List ID'],['$trigger.itemId','List item ID'],['$trigger.changeType','Type of change'],['$trigger.fileName','File name (if file)'],['$trigger.webUrl','Browser link to item'],['$trigger.modifiedBy','Last modified by user']].map(([k,d]) => (
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
