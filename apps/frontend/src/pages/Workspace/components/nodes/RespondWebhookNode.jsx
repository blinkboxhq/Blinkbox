import { SendHorizonal } from 'lucide-react';
import { useState } from 'react';

export default function RespondWebhookNode({ config = {}, updateConfig }) {
  const [isValidJson, setIsValidJson] = useState(true);

  const handleBodyChange = (val) => {
    updateConfig('body', val);
    try { JSON.parse(val); setIsValidJson(true); }
    catch { setIsValidJson(val === ''); }
  };

  const statusCode = config.statusCode || 200;
  const statusColors = {
    2: 'text-green-400 border-green-500/30 bg-green-500/10',
    3: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    4: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    5: 'text-red-400 border-red-500/30 bg-red-500/10',
  };
  const colorKey = String(statusCode)[0];

  return (
    <div className="flex flex-col gap-5 w-full">

      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-sky-500/5 border border-sky-500/20 rounded-xl">
        <div className="p-2 rounded-lg shrink-0 bg-sky-500/10 text-sky-400">
          <SendHorizonal className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-sky-400">Respond to Webhook</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
            Sends a custom response payload
          </span>
        </div>
      </div>

      {/* Status code */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">HTTP Status Code</label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min="100"
            max="599"
            value={statusCode}
            onChange={(e) => updateConfig('statusCode', parseInt(e.target.value))}
            className={`w-24 bg-[#0a0a0a] border rounded-lg px-3 py-2.5 text-xs font-bold focus:outline-none transition-colors ${statusColors[colorKey] || 'text-white border-[#222]'}`}
          />
          <span className="text-xs text-slate-500">
            {statusCode >= 200 && statusCode < 300 ? '✓ Success' :
             statusCode >= 400 && statusCode < 500 ? '⚠ Client Error' :
             statusCode >= 500 ? '✗ Server Error' : '→ Redirect'}
          </span>
        </div>
      </div>

      {/* Content type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Content Type</label>
        <div className="flex bg-[#0a0a0a] p-1 rounded-lg border border-[#222]">
          {['json', 'text'].map((ct) => (
            <button
              key={ct}
              onClick={() => updateConfig('contentType', ct)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${(config.contentType || 'json') === ct ? 'bg-[#222] text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {ct === 'json' ? 'application/json' : 'text/plain'}
            </button>
          ))}
        </div>
      </div>

      {/* Response body */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Response Body (leave empty to pass $json through)
          </label>
          {!isValidJson && <span className="text-[10px] text-red-400 font-bold animate-pulse">Invalid JSON</span>}
        </div>
        <textarea
          value={typeof config.body === 'string' ? config.body : (config.body ? JSON.stringify(config.body, null, 2) : '')}
          onChange={(e) => handleBodyChange(e.target.value)}
          placeholder={'{\n  "status": "ok",\n  "message": "{{ $json.message }}"\n}'}
          rows={6}
          className={`w-full bg-[#0a0a0a] border ${isValidJson ? 'border-[#222] focus:border-sky-500' : 'border-red-500/50 focus:border-red-500'} rounded-lg p-3 text-xs text-sky-100 font-mono focus:outline-none transition-all resize-none leading-relaxed`}
        />
      </div>

      <div className="p-3 bg-sky-500/5 border border-sky-500/10 rounded-lg text-[10px] text-slate-500 leading-relaxed">
        💡 Supports <code className="text-slate-400">{'{{ $json.field }}'}</code> expressions. The response is recorded in the execution log even for async webhooks.
      </div>
    </div>
  );
}
