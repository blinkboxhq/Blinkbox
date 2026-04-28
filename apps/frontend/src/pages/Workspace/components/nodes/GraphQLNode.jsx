import { GitBranch } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const DEFAULT_QUERY = `query {
  user(id: "{{ $json.id }}") {
    name
    email
  }
}`;

export default function GraphQLNode({ config = {}, updateConfig }) {
  const endpoint = config.endpoint ?? '';
  const query = config.query ?? DEFAULT_QUERY;
  const variables = config.variables ?? '';
  const method = config.method ?? 'POST';
  const authType = config.authType ?? 'none';
  const authToken = config.authToken ?? '';
  const headers = config.headers ?? '';
  const timeout = config.timeout ?? 30;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
          <GitBranch className="w-4 h-4 text-pink-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">GraphQL Request</div>
          <div className="text-[11px] text-zinc-500">Query any GraphQL API</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Endpoint URL</label>
        <SmartVariableInput value={endpoint} onChange={(v) => updateConfig('endpoint', v)} placeholder="https://api.example.com/graphql" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Query / Mutation</label>
        <textarea value={query} onChange={(e) => updateConfig('query', e.target.value)} rows={6}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 resize-none" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Variables (JSON)</label>
        <textarea value={variables} onChange={(e) => updateConfig('variables', e.target.value)} rows={3}
          placeholder={'{\n  "id": "{{ $json.userId }}"\n}'}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 resize-none" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Authentication</label>
        <div className="flex gap-1.5 mb-2">
          {['none', 'bearer', 'apikey'].map((a) => (
            <button key={a} onClick={() => updateConfig('authType', a)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold capitalize border transition-all ${authType === a ? 'bg-pink-500/20 border-pink-500/40 text-pink-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {a === 'none' ? 'None' : a === 'bearer' ? 'Bearer Token' : 'API Key'}
            </button>
          ))}
        </div>
        {authType !== 'none' && (
          <input type="password" value={authToken} onChange={(e) => updateConfig('authToken', e.target.value)}
            placeholder={authType === 'bearer' ? 'Bearer token' : 'API key value'}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        )}
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Extra Headers (JSON)</label>
        <textarea value={headers} onChange={(e) => updateConfig('headers', e.target.value)} rows={2}
          placeholder={'{ "X-Custom": "value" }'}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 resize-none" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Timeout (s)</label>
        <input type="number" min={1} max={120} value={timeout} onChange={(e) => updateConfig('timeout', Number(e.target.value))}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">data object, errors array, extensions</span>
      </div>
    </div>
  );
}
