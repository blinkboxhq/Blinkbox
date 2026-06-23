import { useState } from 'react';
import { Globe, KeyRound, ListPlus, Trash2, Lock } from 'lucide-react';
import SmartJsonEditor from '@/components/ui/SmartJsonEditor';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const METHOD_COLORS = {
  GET:    'text-blue-400 bg-blue-500/10 border-blue-500/30',
  POST:   'text-green-400 bg-green-500/10 border-green-500/30',
  PUT:    'text-orange-400 bg-orange-500/10 border-orange-500/30',
  PATCH:  'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  DELETE: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const AUTH_TYPES = [
  { value: 'none',    label: 'None' },
  { value: 'bearer',  label: 'Bearer Token' },
  { value: 'api_key', label: 'API Key' },
  { value: 'basic',   label: 'Basic Auth' },
];

export default function HttpRequestNode({ config = {}, updateConfig, nodeId }) {
  const [activeTab, setActiveTab] = useState('endpoint');
  const method   = config.method   || 'GET';
  const authType = config.authType || 'none';

  const headersObj    = config.headers || {};
  const headerEntries = Object.entries(headersObj);

  const updateHeader = (oldKey, newKey, newValue) => {
    const h = { ...headersObj };
    if (oldKey !== newKey) delete h[oldKey];
    if (newKey) h[newKey] = newValue;
    updateConfig('headers', h);
  };
  const removeHeader = (key) => { const h = { ...headersObj }; delete h[key]; updateConfig('headers', h); };
  const addHeader    = () => updateConfig('headers', { ...headersObj, 'New-Header': '' });

  const tabs = [
    { id: 'endpoint', label: 'Endpoint' },
    { id: 'auth',     label: 'Auth', badge: authType !== 'none' ? '✓' : null },
    { id: 'body',     label: 'Payload' },
    { id: 'headers',  label: 'Headers', badge: headerEntries.length > 0 ? headerEntries.length : null },
  ];

  return (
    <div className="flex flex-col gap-4 w-full">

      {/* Header summary */}
      <div className="flex items-center gap-3 p-3.5 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <div className={`p-2 rounded-lg shrink-0 border ${METHOD_COLORS[method]}`}>
          <Globe className="w-4 h-4" />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-[12px] font-bold text-blue-400 truncate">
            {config.url || 'No URL set'}
          </span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
            {method} · {authType === 'none' ? 'No Auth' : AUTH_TYPES.find(a => a.value === authType)?.label}
          </span>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-md transition-all ${activeTab === t.id ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {t.label}
            {t.badge && <span className="bg-blue-500 text-white text-[9px] px-1.5 py-px rounded-full leading-none">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Tab contents */}
      <div className="relative min-h-[220px]">

        {/* Endpoint */}
        <div className={`absolute inset-0 flex flex-col gap-3 transition-opacity duration-150 ${activeTab === 'endpoint' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Method</label>
            <div className="flex gap-1.5">
              {METHODS.map(m => (
                <button key={m} onClick={() => updateConfig('method', m)}
                  className={`flex-1 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${method === m ? METHOD_COLORS[m] : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <SmartVariableInput
            label="URL"
            value={config.url || ''}
            onChange={v => updateConfig('url', v)}
            placeholder="https://api.example.com/v1/endpoint"
            nodeId={nodeId}
          />
          <SmartVariableInput
            label="Query Params (JSON)"
            value={config.queryParams ? JSON.stringify(config.queryParams) : ''}
            onChange={v => { try { updateConfig('queryParams', JSON.parse(v)); } catch { updateConfig('queryParams', v); } }}
            placeholder='{"page": "1", "limit": "20"}'
            nodeId={nodeId}
          />
        </div>

        {/* Auth */}
        <div className={`absolute inset-0 flex flex-col gap-4 transition-opacity duration-150 ${activeTab === 'auth' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Auth Type</label>
            <div className="grid grid-cols-2 gap-1.5">
              {AUTH_TYPES.map(a => (
                <button key={a.value} onClick={() => updateConfig('authType', a.value)}
                  className={`py-2 rounded-lg border text-[11px] font-bold transition-all ${authType === a.value ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {authType !== 'none' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Lock className="w-3 h-3 text-blue-400" />
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Credential</label>
              </div>
              <CredentialPicker
                label={AUTH_TYPES.find(a => a.value === authType)?.label + ' Credential'}
                value={config.credentialId || ''}
                onChange={v => updateConfig('credentialId', v)}
                accentColor="blue"
                placeholder="Select a stored credential…"
              />
              <p className="text-[10px] text-zinc-600 mt-0.5">
                {authType === 'bearer'  && 'Injects Authorization: Bearer <token> header.'}
                {authType === 'api_key' && 'Injects x-api-key: <key> header.'}
                {authType === 'basic'   && 'Injects Authorization: Basic base64(user:pass) header.'}
              </p>
            </div>
          )}
        </div>

        {/* Payload */}
        <div className={`absolute inset-0 flex flex-col gap-2 transition-opacity duration-150 ${activeTab === 'body' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <SmartJsonEditor
            label="JSON Body"
            value={config.body || ''}
            onChange={v => updateConfig('body', v)}
            rows={9}
          />
        </div>

        {/* Headers */}
        <div className={`absolute inset-0 flex flex-col gap-3 transition-opacity duration-150 ${activeTab === 'headers' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none overflow-y-auto'}`}>
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <label className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <KeyRound className="w-3.5 h-3.5 text-blue-400" /> Custom Headers
            </label>
            <button onClick={addHeader} className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded transition-colors uppercase tracking-wider">
              <ListPlus className="w-3 h-3" /> Add
            </button>
          </div>
          {headerEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 text-center text-zinc-600 gap-2 border border-dashed border-zinc-800 rounded-xl bg-zinc-950">
              <KeyRound className="w-5 h-5 opacity-40" />
              <span className="text-[11px]">No custom headers yet</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {headerEntries.map(([k, v], i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <input value={k} onChange={e => updateHeader(k, e.target.value, v)} placeholder="Header-Name"
                    className="w-2/5 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-[11px] text-white font-mono focus:outline-none focus:border-zinc-600" />
                  <span className="text-zinc-700 font-bold shrink-0">:</span>
                  <input value={v} onChange={e => updateHeader(k, k, e.target.value)} placeholder="value"
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-[11px] text-blue-300 font-mono focus:outline-none focus:border-zinc-600" />
                  <button onClick={() => removeHeader(k)} className="p-1.5 text-zinc-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}