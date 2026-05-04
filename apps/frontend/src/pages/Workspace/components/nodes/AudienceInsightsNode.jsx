import { BarChart2 } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

export default function AudienceInsightsNode({ config = {}, updateConfig, nodeId }) {
  const platform    = config.platform    ?? 'instagram';
  const metric      = config.metric      ?? 'overview'; // overview | reach | engagement | followers | posts
  const period      = config.period      ?? '28d'; // 7d | 28d | 90d
  const accessToken = config.accessToken ?? '';
  const accountId   = config.accountId   ?? '';
  const aiSummary   = config.aiSummary   ?? true;
  const aiModel     = config.aiModel     ?? 'gpt-4o-mini';
  const aiKey       = config.aiKey       ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <BarChart2 className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Audience Insights</div>
          <div className="text-[11px] text-zinc-500">Pull analytics summary from social platforms</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Platform</label>
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: 'instagram', label: 'Instagram' },
            { value: 'youtube',   label: 'YouTube' },
            { value: 'twitter',   label: 'Twitter / X' },
            { value: 'linkedin',  label: 'LinkedIn' },
            { value: 'tiktok',    label: 'TikTok' },
          ].map((p) => (
            <button key={p.value} onClick={() => updateConfig('platform', p.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${platform === p.value ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Metric Category</label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { value: 'overview',    label: 'Overview' },
            { value: 'reach',       label: 'Reach' },
            { value: 'engagement',  label: 'Engagement' },
            { value: 'followers',   label: 'Followers' },
            { value: 'posts',       label: 'Top Posts' },
            { value: 'demographics',label: 'Demographics' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('metric', m.value)}
              className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${metric === m.value ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Time Period</label>
        <div className="flex gap-1.5">
          {[
            { value: '7d',  label: '7 Days' },
            { value: '28d', label: '28 Days' },
            { value: '90d', label: '90 Days' },
            { value: '1y',  label: '1 Year' },
          ].map((p) => (
            <button key={p.value} onClick={() => updateConfig('period', p.value)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${period === p.value ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Account ID (if required)</label>
        <SmartVariableInput value={accountId} onChange={(v) => updateConfig('accountId', v)} placeholder="{{ $json.accountId }}" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Access Token</label>
        <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="API Key"
        placeholder="Select API Key..."
      />
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">AI Summary</p>
          <p className="text-[10px] text-zinc-600">Generate a plain-English insights report</p>
        </div>
        <button onClick={() => updateConfig('aiSummary', !aiSummary)}
          className={`w-10 h-5 rounded-full border transition-all relative ${aiSummary ? 'bg-blue-500 border-blue-400' : 'bg-zinc-700 border-zinc-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${aiSummary ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      {aiSummary && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">AI Model</label>
            <select value={aiModel} onChange={(e) => updateConfig('aiModel', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku</option>
            </select>
          </div>
          <div className="flex-1">
            <CredentialPicker value={config.aiKey || ''} onChange={(id) => updateConfig('aiKey', id)}
              accentColor="violet" label="AI API Key" credentialType="OpenAI" placeholder="Select AI credential..." />
          </div>
        </div>
      )}

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">metrics object, period, platform{aiSummary ? ', aiSummary string' : ''}</span>
      </div>
    </div>
  );
}
