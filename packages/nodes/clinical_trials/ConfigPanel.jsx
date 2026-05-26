import { HeartPulse } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';

export default function ClinicalTrialsNode({ config = {}, updateConfig, nodeId }) {
  const query = config.query ?? '';
  const condition = config.condition ?? '';
  const status = config.status ?? ''; // 'Recruiting' | 'Completed' | etc.
  const phase = config.phase ?? '';
  const maxResults = config.maxResults ?? 10;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <HeartPulse className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Clinical Trials Search</div>
          <div className="text-[11px] text-zinc-500">Query ClinicalTrials.gov database</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Search Query</label>
        <SmartVariableInput value={query} onChange={(v) => updateConfig('query', v)} placeholder="cancer immunotherapy" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Condition / Disease (optional)</label>
        <SmartVariableInput value={condition} onChange={(v) => updateConfig('condition', v)} placeholder="Type 2 Diabetes" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Recruitment Status</label>
        <select value={status} onChange={(e) => updateConfig('status', e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
          <option value="">Any</option>
          <option value="RECRUITING">Recruiting</option>
          <option value="ACTIVE_NOT_RECRUITING">Active, Not Recruiting</option>
          <option value="COMPLETED">Completed</option>
          <option value="NOT_YET_RECRUITING">Not Yet Recruiting</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Phase</label>
        <div className="flex gap-1.5 flex-wrap">
          {['', 'EARLY_PHASE1', 'PHASE1', 'PHASE2', 'PHASE3', 'PHASE4'].map((p) => (
            <button key={p} onClick={() => updateConfig('phase', p)}
              className={`py-1 px-2.5 rounded-lg text-[10px] font-bold border transition-all ${phase === p ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {p === '' ? 'Any' : p.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Max Results</label>
        <input type="number" min={1} max={50} value={maxResults} onChange={(e) => updateConfig('maxResults', Number(e.target.value))}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">NCT ID, title, status, phase, sponsor, start date, eligibility</span>
      </div>
    </div>
  );
}
