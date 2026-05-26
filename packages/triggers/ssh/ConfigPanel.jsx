import { useState } from 'react';
import { Terminal, Eye, EyeOff } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';

const INTERVALS = [
  { label: 'Every 1 min',  value: '1' },
  { label: 'Every 5 min',  value: '5' },
  { label: 'Every 15 min', value: '15' },
  { label: 'Every 30 min', value: '30' },
  { label: 'Every hour',   value: '60' },
];

export default function SshTriggerNode({ config = {}, updateConfig, nodeId }) {
  const [showPass, setShowPass] = useState(false);
  const authMethod = config.authMethod || 'password';

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111] rounded-t-xl">
        <Terminal className="w-3 h-3 text-zinc-300" />
        <span className="text-[11px] font-semibold text-zinc-200">SSH Command</span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Host</label>
            <SmartVariableInput value={config.host || ''} onChange={(v) => updateConfig?.('host', v)} placeholder="192.168.1.1" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Port</label>
            <SmartVariableInput value={config.port || '22'} onChange={(v) => updateConfig?.('port', v)} placeholder="22" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Username</label>
          <SmartVariableInput value={config.username || ''} onChange={(v) => updateConfig?.('username', v)} placeholder="ubuntu" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Auth Method</label>
          <div className="flex gap-1.5">
            {['password', 'privateKey'].map((m) => (
              <button key={m} onClick={() => updateConfig?.('authMethod', m)}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${authMethod === m ? 'bg-zinc-700/60 border-zinc-500 text-zinc-200' : 'bg-[#111] border-[#222] text-zinc-600 hover:text-zinc-400'}`}>
                {m === 'password' ? 'Password' : 'Private Key'}
              </button>
            ))}
          </div>
        </div>
        {authMethod === 'password' ? (
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Password</label>
            <div className="flex items-center gap-1 bg-[#111] border border-[#222] rounded-lg px-2.5 py-1.5">
              <input type={showPass ? 'text' : 'password'} value={config.password || ''} onChange={(e) => updateConfig?.('password', e.target.value)}
                placeholder="••••••••" className="flex-1 bg-transparent text-[10px] text-zinc-300 outline-none" />
              <button onClick={() => setShowPass(!showPass)} className="text-zinc-600 hover:text-zinc-400">
                {showPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Private Key (PEM)</label>
            <textarea value={config.privateKey || ''} onChange={(e) => updateConfig?.('privateKey', e.target.value)}
              rows={3} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
              className="w-full bg-[#111] border border-[#222] rounded-lg px-2.5 py-1.5 text-[9px] text-zinc-300 font-mono outline-none focus:border-zinc-500 resize-none" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Command</label>
          <SmartVariableInput value={config.command || ''} onChange={(v) => updateConfig?.('command', v)} placeholder="df -h / | tail -1" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Poll interval</label>
          <select value={config.pollIntervalMinutes || '5'} onChange={(e) => updateConfig?.('pollIntervalMinutes', e.target.value)}
            className="w-full bg-[#111] border border-[#222] rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-200 outline-none">
            {INTERVALS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between p-2 bg-[#111] border border-[#1e1e1e] rounded-lg">
          <span className="text-[10px] text-zinc-300">Only fire on output change</span>
          <div className={`w-8 h-4 rounded-full p-0.5 cursor-pointer transition-colors ${config.onlyOnChange ? 'bg-zinc-400' : 'bg-zinc-700'}`}
            onClick={() => updateConfig?.('onlyOnChange', !config.onlyOnChange)}>
            <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${config.onlyOnChange ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </div>
        <div className="p-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-0.5">Available as</span>
          {['$trigger.stdout', '$trigger.stderr', '$trigger.exitCode', '$trigger.host'].map((v) => (
            <span key={v} className="text-[9px] font-mono text-zinc-500 block">{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
