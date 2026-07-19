import { Thermometer } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

export default function WeatherNode({ config = {}, updateConfig, nodeId }) {
  const location = config.location ?? '';
  const mode = config.mode ?? 'current'; // 'current' | 'forecast'
  const days = config.days ?? 3;
  const units = config.units ?? 'metric'; // 'metric' | 'imperial'

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
          <Thermometer className="w-4 h-4 text-sky-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Weather</div>
          <div className="text-[11px] text-zinc-500">Current weather or forecast via OpenWeatherMap</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Location</label>
        <SmartVariableInput value={location} onChange={(v) => updateConfig('location', v)} placeholder="Mumbai, IN  or  {{ $json.city }}" />
        <p className="text-[10px] text-zinc-600 mt-1">City name, "City,CountryCode" or lat,lon</p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Mode</label>
        <div className="flex gap-1.5">
          {[{ value: 'current', label: 'Current Weather' }, { value: 'forecast', label: 'Forecast' }].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-2 rounded-lg text-[12px] font-bold border transition-all ${mode === m.value ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'forecast' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Days Ahead</label>
          <input type="number" min={1} max={7} value={days} onChange={(e) => updateConfig('days', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Units</label>
        <div className="flex gap-1.5">
          {[{ value: 'metric', label: '°C / km/h' }, { value: 'imperial', label: '°F / mph' }, { value: 'standard', label: 'K / m/s' }].map((u) => (
            <button key={u.value} onClick={() => updateConfig('units', u.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${units === u.value ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {u.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <CredentialPicker
          value={config.credentialId || ''}
          onChange={(id) => updateConfig('credentialId', id)}
          accentColor="blue"
          label="OpenWeatherMap API Key"
          placeholder="Select API key..."
        />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">temp, feels_like, humidity, wind, description, icon, sunrise, sunset</span>
      </div>
    </div>
  );
}
