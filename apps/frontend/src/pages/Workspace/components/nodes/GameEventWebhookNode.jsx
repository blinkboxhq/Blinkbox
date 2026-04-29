import { Zap } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const COMMON_EVENTS = [
  'player.join','player.leave','player.death','player.kill','player.levelup',
  'match.start','match.end','item.pickup','item.drop','achievement.unlock',
  'quest.complete','boss.defeat','purchase.made','season.end','ban.issued',
];

export default function GameEventWebhookNode({ config = {}, updateConfig }) {
  const eventType   = config.eventType   ?? '';
  const filter      = config.filter      ?? '';
  const secret      = config.secret      ?? '';
  const transform   = config.transform   ?? '';
  const outputField = config.outputField ?? 'event';
  const validateSchema = config.validateSchema ?? false;
  const schema      = config.schema      ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <Zap className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Game Event Webhook</div>
          <div className="text-[11px] text-zinc-500">Receive, filter and transform in-game events</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Expected Event Type (optional filter)</label>
        <SmartVariableInput value={eventType} onChange={(v) => updateConfig('eventType', v)}
          placeholder='player.kill  or  match.*  or  {{ $json.event }}' />
        <div className="flex flex-wrap gap-1 mt-2">
          {COMMON_EVENTS.slice(0, 8).map((e) => (
            <button key={e} onClick={() => updateConfig('eventType', e)}
              className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-zinc-300 font-mono transition-colors">
              {e}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {COMMON_EVENTS.slice(8).map((e) => (
            <button key={e} onClick={() => updateConfig('eventType', e)}
              className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-zinc-300 font-mono transition-colors">
              {e}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Condition Filter (optional)</label>
        <SmartVariableInput value={filter} onChange={(v) => updateConfig('filter', v)}
          placeholder='{{ $json.player.level }} >= 10  or  {{ $json.kills }} > 5' multiline />
        <p className="text-[10px] text-zinc-600 mt-1">Only continue if condition is true. Leave blank to accept all.</p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Webhook Secret (HMAC verification)</label>
        <input type="password" value={secret} onChange={(e) => updateConfig('secret', e.target.value)}
          placeholder="Secret shared with your game server"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        <p className="text-[10px] text-zinc-600 mt-1">Leave blank to skip signature verification</p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Output Field Mapping (optional)</label>
        <SmartVariableInput value={transform} onChange={(v) => updateConfig('transform', v)}
          placeholder='playerId: {{ $json.player.id }}, score: {{ $json.data.score }}' multiline />
        <p className="text-[10px] text-zinc-600 mt-1">Map event fields to standardized output. Leave blank for raw passthrough.</p>
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Validate Schema</p>
          <p className="text-[10px] text-zinc-600">Reject events that don't match expected shape</p>
        </div>
        <button onClick={() => updateConfig('validateSchema', !validateSchema)}
          className={`w-10 h-5 rounded-full border transition-all relative ${validateSchema ? 'bg-green-500 border-green-400' : 'bg-zinc-700 border-zinc-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${validateSchema ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      {validateSchema && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Required Fields (comma-separated)</label>
          <input value={schema} onChange={(e) => updateConfig('schema', e.target.value)} placeholder="player.id, event, timestamp"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        </div>
      )}

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">event payload (raw or mapped), eventType, receivedAt, verified</span>
      </div>
    </div>
  );
}
