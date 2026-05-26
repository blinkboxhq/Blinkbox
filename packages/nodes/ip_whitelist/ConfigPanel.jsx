import { Shield } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';

export default function IpWhitelistNode({ config = {}, updateConfig, nodeId }) {
  const ip          = config.ip          ?? '';
  const whitelist   = config.whitelist   ?? '';
  const mode        = config.mode        ?? 'whitelist'; // whitelist | blacklist
  const failIfBlock = config.failIfBlock ?? true;
  const allowPrivate= config.allowPrivate?? false;
  const lookupGeo   = config.lookupGeo   ?? false;
  const blockCountries = config.blockCountries ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Shield className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">IP Whitelist Check</div>
          <div className="text-[11px] text-zinc-500">Allow or block IPs, ranges and countries</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">IP Address to Check</label>
        <SmartVariableInput value={ip} onChange={(v) => updateConfig('ip', v)} placeholder='{{ $json.ip }}  or  {{ $request.headers["x-forwarded-for"] }}' />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Mode</label>
        <div className="flex gap-1.5">
          {[
            { value: 'whitelist', label: 'Whitelist', desc: 'Allow only listed IPs' },
            { value: 'blacklist', label: 'Blacklist', desc: 'Block listed IPs, allow rest' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 flex flex-col py-2 px-3 rounded-lg border transition-all ${mode === m.value ? 'bg-red-500/20 border-red-500/40' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
              <span className={`text-[11px] font-bold ${mode === m.value ? 'text-red-300' : 'text-zinc-400'}`}>{m.label}</span>
              <span className="text-[9px] text-zinc-600">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">IP List (one per line, supports CIDR)</label>
        <textarea value={whitelist} onChange={(e) => updateConfig('whitelist', e.target.value)} rows={5}
          placeholder={"192.168.1.100\n10.0.0.0/8\n203.0.113.0/24\n{{ $json.allowedIp }}"}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 resize-none" />
        <p className="text-[10px] text-zinc-600 mt-1">Supports exact IPs, CIDR ranges (10.0.0.0/8), and wildcards (192.168.*)</p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Block Countries (ISO codes, optional)</label>
        <SmartVariableInput value={blockCountries} onChange={(v) => updateConfig('blockCountries', v)} placeholder="CN, RU, KP" />
      </div>

      <div className="flex flex-col gap-2">
        {[
          { key: 'allowPrivate', label: 'Allow Private IPs',    desc: '10.x, 172.16.x, 192.168.x always pass' },
          { key: 'lookupGeo',    label: 'Include Geo Info',     desc: 'Add country, city to output' },
          { key: 'failIfBlock',  label: 'Stop if Blocked',      desc: 'Route to error/false when IP is blocked' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <div>
              <p className="text-[12px] font-semibold text-zinc-300">{label}</p>
              <p className="text-[10px] text-zinc-600">{desc}</p>
            </div>
            <button onClick={() => updateConfig(key, !config[key])}
              className={`w-10 h-5 rounded-full border transition-all relative ${config[key] ? 'bg-red-500 border-red-400' : 'bg-zinc-700 border-zinc-600'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config[key] ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">allowed (bool), ip, matchedRule{lookupGeo ? ', country, city' : ''}</span>
      </div>
    </div>
  );
}
