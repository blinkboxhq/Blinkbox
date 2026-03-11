import { useState } from 'react';
import { Globe, Code, KeyRound, Braces, ListPlus, Trash2 } from 'lucide-react';
import SmartJsonEditor from '../../../../components/ui/SmartJsonEditor';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function HttpRequestNode({ config = {}, updateConfig }) {
  const [activeTab, setActiveTab] = useState('endpoint');
  const method = config.method || 'GET';

  const methodColors = {
    GET: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    POST: 'text-green-400 bg-green-500/10 border-green-500/30',
    PUT: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    DELETE: 'text-red-400 bg-red-500/10 border-red-500/30'
  };

  // 📝 Helper to manage Headers as an Array in the UI, but Object in the config
  const headersObj = config.headers || {};
  const headerEntries = Object.entries(headersObj);

  const updateHeader = (oldKey, newKey, newValue) => {
    const newHeaders = { ...headersObj };
    if (oldKey !== newKey) delete newHeaders[oldKey];
    if (newKey) newHeaders[newKey] = newValue;
    updateConfig('headers', newHeaders);
  };

  const removeHeader = (key) => {
    const newHeaders = { ...headersObj };
    delete newHeaders[key];
    updateConfig('headers', newHeaders);
  };

  const addHeader = () => {
    updateConfig('headers', { ...headersObj, ['New-Header']: '' });
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      
      {/* 1. PREMIUM HEADER SUMMARY */}
      <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <div className={`p-2 rounded-lg shrink-0 ${methodColors[method]}`}>
          <Globe className="w-5 h-5" />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-bold text-blue-400 truncate">
            {config.url ? config.url : 'Awaiting Endpoint URL'}
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
            Outbound API Request
          </span>
        </div>
      </div>

      {/* 2. THE POSTMAN-STYLE TAB NAVIGATION */}
      <div className="flex bg-[#0a0a0a] p-1 rounded-lg border border-[#222]">
        <button 
          onClick={() => setActiveTab('endpoint')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'endpoint' ? 'bg-[#222] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Endpoint
        </button>
        <button 
          onClick={() => setActiveTab('body')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'body' ? 'bg-[#222] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Payload
        </button>
        <button 
          onClick={() => setActiveTab('headers')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'headers' ? 'bg-[#222] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Headers
          {headerEntries.length > 0 && (
            <span className="bg-blue-500 text-white text-[9px] px-1.5 rounded-full">{headerEntries.length}</span>
          )}
        </button>
      </div>

      {/* 3. TAB CONTENTS (Ultra-Fast CSS Switching) */}
      <div className="flex flex-col relative min-h-[250px]">
        
        {/* --- ENDPOINT TAB --- */}
        <div className={`absolute inset-0 transition-opacity duration-200 flex flex-col gap-4 ${activeTab === 'endpoint' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-1.5 w-[100px] shrink-0">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Method</label>
              <select 
                value={method} 
                onChange={(e) => updateConfig('method', e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer appearance-none text-center"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="flex-1">
              <SmartVariableInput
                label="Target URL"
                value={config.url || ''}
                onChange={(val) => updateConfig('url', val)}
                placeholder="https://api.example.com/v1/users"
              />
            </div>
          </div>
        </div>

        {/* --- PAYLOAD (BODY) TAB --- */}
        <div className={`absolute inset-0 transition-opacity duration-200 flex flex-col gap-2 ${activeTab === 'body' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <SmartJsonEditor
            label="JSON Body"
            value={config.body || ''}
            onChange={(val) => updateConfig('body', val)}
            rows={8}
          />
        </div>

        {/* --- HEADERS TAB --- */}
        <div className={`absolute inset-0 transition-opacity duration-200 flex flex-col gap-3 ${activeTab === 'headers' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none overflow-y-auto'}`}>
          <div className="flex items-center justify-between pb-2 border-b border-[#222]">
            <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <KeyRound className="w-3.5 h-3.5 text-blue-400" /> Request Headers
            </label>
            <button onClick={addHeader} className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded transition-colors uppercase tracking-wider">
              <ListPlus className="w-3 h-3" /> Add Header
            </button>
          </div>

          {headerEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center text-slate-600 gap-2 border border-dashed border-[#222] rounded-xl bg-[#0a0a0a]">
              <KeyRound className="w-6 h-6 opacity-50" />
              <span className="text-xs">No custom headers attached.<br/>Click "Add Header" to inject auth keys.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {headerEntries.map(([k, v], i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <input 
                    value={k}
                    onChange={(e) => updateHeader(k, e.target.value, v)}
                    placeholder="e.g. Authorization"
                    className="w-1/3 bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors font-mono placeholder:font-sans placeholder-slate-600"
                  />
                  <span className="text-slate-600 font-bold">:</span>
                  <input 
                    value={v}
                    onChange={(e) => updateHeader(k, k, e.target.value)}
                    placeholder="Bearer token..."
                    className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-blue-300 focus:outline-none focus:border-blue-500 transition-colors font-mono placeholder:font-sans placeholder-slate-600"
                  />
                  <button onClick={() => removeHeader(k)} className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                    <Trash2 className="w-4 h-4" />
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