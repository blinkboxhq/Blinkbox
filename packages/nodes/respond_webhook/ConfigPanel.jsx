import { Send } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';

const COMMON_STATUSES = [200, 201, 204, 400, 401, 403, 404, 422, 429, 500, 502, 503];

export default function WebhookResponseNode({ config = {}, updateConfig, nodeId }) {
  const statusCode = config.statusCode ?? 200;
  const body = config.body ?? '';
  const contentType = config.contentType ?? 'application/json';
  const headers = config.headers ?? '';
  const mode = config.mode ?? 'json'; // 'json' | 'text' | 'html' | 'empty'

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Send className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Webhook Response</div>
          <div className="text-[11px] text-zinc-500">Send a custom HTTP response to the webhook caller</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Status Code</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {COMMON_STATUSES.map((s) => (
            <button key={s} onClick={() => updateConfig('statusCode', s)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${statusCode === s
                ? s < 400 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : s < 500 ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-red-500/20 border-red-500/40 text-red-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {s}
            </button>
          ))}
        </div>
        <input type="number" min={100} max={599} value={statusCode} onChange={(e) => updateConfig('statusCode', Number(e.target.value))}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Response Body Type</label>
        <div className="flex gap-1.5">
          {[
            { value: 'json',  label: 'JSON' },
            { value: 'text',  label: 'Plain Text' },
            { value: 'html',  label: 'HTML' },
            { value: 'empty', label: 'Empty' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${mode === m.value ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode !== 'empty' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Body</label>
          <SmartVariableInput value={body} onChange={(v) => updateConfig('body', v)}
            placeholder={mode === 'json' ? '{ "success": true, "data": {{ $json.result }} }' : mode === 'html' ? '<h1>Hello {{ $json.name }}</h1>' : '{{ $json.message }}'}
            multiline />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Extra Headers (JSON)</label>
        <textarea value={headers} onChange={(e) => updateConfig('headers', e.target.value)} rows={2}
          placeholder={'{ "X-Request-Id": "{{ $json.id }}", "Cache-Control": "no-cache" }'}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 resize-none" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Sends HTTP <span className="text-zinc-300 font-bold">{statusCode}</span> response to the waiting webhook caller and continues the workflow.
      </div>
    </div>
  );
}
