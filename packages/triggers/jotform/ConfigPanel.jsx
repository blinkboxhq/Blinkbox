import { Check, Info } from 'lucide-react';
import CredentialPicker from '@/components/ui/CredentialPicker';
import logoJotform from './logo.svg';

export default function JotformTriggerNode({ config = {}, updateConfig }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <img src={logoJotform} alt="Jotform" className="w-3.5 h-3.5 object-contain" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Jotform</span>
        <span className="ml-auto text-[9px] font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">TRIGGER</span>
      </div>

      <div className="p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <CredentialPicker
            label="Jotform API Key"
            value={config.credentialId || ''}
            onChange={(v) => updateConfig?.('credentialId', v)}
            placeholder="Select Jotform API key credential…"
          />
          <p className="text-[9px] text-zinc-600">Jotform → Settings → API → Create New Key (Full Access).</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Form ID</label>
          <input value={config.formId || ''}
            onChange={(e) => updateConfig?.('formId', e.target.value)}
            placeholder="240123456789012"
            className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-500/50 transition-colors"
          />
          <p className="text-[9px] text-zinc-600">From the form URL: jotform.com/build/<span className="font-mono text-zinc-500">FORM_ID</span></p>
        </div>

        {config.webhookRegistered ? (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-2">
            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="text-[10px] text-emerald-400">Webhook registered — submissions arrive instantly.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2">
            <Info className="w-3 h-3 text-zinc-500 shrink-0" />
            <span className="text-[10px] text-zinc-500">Webhook registers automatically when the automation is turned on.</span>
          </div>
        )}
      </div>
    </div>
  );
}
