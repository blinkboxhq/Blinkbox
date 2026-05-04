import { Trophy } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

export default function LeaderboardUpdateNode({ config = {}, updateConfig, nodeId }) {
  const mode          = config.mode          ?? 'upsert'; // upsert | get | top | reset | rank
  const leaderboardId = config.leaderboardId ?? 'global';
  const playerId      = config.playerId      ?? '';
  const playerName    = config.playerName    ?? '';
  const score         = config.score         ?? '';
  const strategy      = config.strategy      ?? 'highest'; // highest | latest | cumulative
  const topN          = config.topN          ?? 10;
  const metadata      = config.metadata      ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-yellow-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Leaderboard Update</div>
          <div className="text-[11px] text-zinc-500">Update scores, fetch rankings and manage leaderboards</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Action</label>
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: 'upsert', label: 'Submit Score' },
            { value: 'get',    label: 'Get Player' },
            { value: 'top',    label: 'Top N Players' },
            { value: 'rank',   label: 'Player Rank' },
            { value: 'reset',  label: 'Reset Board' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${mode === m.value ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Leaderboard ID</label>
        <SmartVariableInput value={leaderboardId} onChange={(v) => updateConfig('leaderboardId', v)} placeholder='global  or  season-3  or  {{ $json.gameMode }}' />
      </div>

      {(mode === 'upsert' || mode === 'get' || mode === 'rank') && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Player ID</label>
          <SmartVariableInput value={playerId} onChange={(v) => updateConfig('playerId', v)} placeholder="{{ $json.playerId }}" />
        </div>
      )}

      {mode === 'upsert' && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Player Name</label>
            <SmartVariableInput value={playerName} onChange={(v) => updateConfig('playerName', v)} placeholder="{{ $json.username }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Score</label>
            <SmartVariableInput value={score} onChange={(v) => updateConfig('score', v)} placeholder="{{ $json.score }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Score Strategy</label>
            <div className="flex gap-1.5">
              {[
                { value: 'highest',    label: 'Keep Highest',  desc: 'Only update if new score > stored' },
                { value: 'latest',     label: 'Always Replace', desc: 'Always overwrite with latest score' },
                { value: 'cumulative', label: 'Accumulate',    desc: 'Add new score to existing total' },
              ].map((s) => (
                <button key={s.value} onClick={() => updateConfig('strategy', s.value)}
                  className={`flex-1 flex flex-col py-2 px-2 rounded-lg border transition-all text-left ${strategy === s.value ? 'bg-yellow-500/20 border-yellow-500/40' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
                  <span className={`text-[10px] font-bold ${strategy === s.value ? 'text-yellow-300' : 'text-zinc-400'}`}>{s.label}</span>
                  <span className="text-[9px] text-zinc-600 mt-0.5">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Metadata (JSON, optional)</label>
            <textarea value={metadata} onChange={(e) => updateConfig('metadata', e.target.value)} rows={2}
              placeholder={'{ "level": 42, "character": "warrior", "killStreak": 15 }'}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[12px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 resize-none" />
          </div>
        </>
      )}

      {mode === 'top' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Top N Players</label>
          <input type="number" min={1} max={100} value={topN} onChange={(e) => updateConfig('topN', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      )}

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {mode === 'upsert' && <>Returns: <span className="text-zinc-300">playerId, score, rank, previousRank, rankChange</span></>}
        {mode === 'get'    && <>Returns: <span className="text-zinc-300">playerId, name, score, rank, metadata</span></>}
        {mode === 'top'    && <>Returns: <span className="text-zinc-300">players[] with rank, name, score, metadata</span></>}
        {mode === 'rank'   && <>Returns: <span className="text-zinc-300">rank, score, totalPlayers, percentile</span></>}
        {mode === 'reset'  && <>Returns: <span className="text-zinc-300">success, clearedCount, leaderboardId</span></>}
      </div>
    </div>
  );
}
