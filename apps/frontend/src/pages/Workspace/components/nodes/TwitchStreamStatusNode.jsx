import { Radio } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function TwitchStreamStatusNode({ config = {}, updateConfig, nodeId }) {
  const username    = config.username    ?? '';
  const mode        = config.mode        ?? 'status'; // status | info | clips | schedule
  const clientId    = config.clientId    ?? '';
  const accessToken = config.accessToken ?? '';
  const clipsCount  = config.clipsCount  ?? 5;
  const alertOnLive = config.alertOnLive ?? false;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#9146FF]/20 border border-[#9146FF]/40 flex items-center justify-center">
          <Radio className="w-4 h-4 text-[#9146FF]" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Twitch Stream Status</div>
          <div className="text-[11px] text-zinc-500">Check live status, stream info, clips and schedule</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Mode</label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { value: 'status',   label: 'Live Status',  desc: 'Is streamer live?' },
            { value: 'info',     label: 'Stream Info',  desc: 'Title, game, viewers' },
            { value: 'clips',    label: 'Top Clips',    desc: 'Most popular clips' },
            { value: 'schedule', label: 'Schedule',     desc: 'Upcoming streams' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex flex-col py-2 px-3 rounded-lg border transition-all text-left ${mode === m.value ? 'bg-[#9146FF]/20 border-[#9146FF]/40' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
              <span className={`text-[11px] font-bold ${mode === m.value ? 'text-[#9146FF]' : 'text-zinc-400'}`}>{m.label}</span>
              <span className="text-[9px] text-zinc-600">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Streamer Username</label>
        <SmartVariableInput value={username} onChange={(v) => updateConfig('username', v)} placeholder='shroud  or  {{ $json.streamer }}' />
      </div>

      {mode === 'clips' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Number of Clips</label>
          <input type="number" min={1} max={20} value={clipsCount} onChange={(e) => updateConfig('clipsCount', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      )}

      {mode === 'status' && (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
          <div>
            <p className="text-[12px] font-semibold text-zinc-300">Fail if Offline</p>
            <p className="text-[10px] text-zinc-600">Route to false/error path when streamer is offline</p>
          </div>
          <button onClick={() => updateConfig('alertOnLive', !alertOnLive)}
            className={`w-10 h-5 rounded-full border transition-all relative ${alertOnLive ? 'bg-[#9146FF] border-[#9146FF]' : 'bg-zinc-700 border-zinc-600'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${alertOnLive ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      )}

      <div className="border-t border-zinc-800 pt-3">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Twitch API Credentials</label>
        <div className="flex flex-col gap-2">
          <input value={clientId} onChange={(e) => updateConfig('clientId', e.target.value)} placeholder="Client ID (dev.twitch.tv)"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
          <input type="password" value={accessToken} onChange={(e) => updateConfig('accessToken', e.target.value)} placeholder="App Access Token"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {mode === 'status'   && <>Returns: <span className="text-zinc-300">isLive, startedAt, viewerCount, game</span></>}
        {mode === 'info'     && <>Returns: <span className="text-zinc-300">title, game, viewers, language, thumbnailUrl, tags[]</span></>}
        {mode === 'clips'    && <>Returns: <span className="text-zinc-300">clips[] with title, url, views, thumbnailUrl, duration</span></>}
        {mode === 'schedule' && <>Returns: <span className="text-zinc-300">segments[] with title, startTime, game, duration</span></>}
      </div>
    </div>
  );
}
