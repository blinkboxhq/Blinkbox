import { Clock } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const TIMEZONES = ['Asia/Kolkata','UTC','America/New_York','America/Los_Angeles','Europe/London','Europe/Berlin','Asia/Tokyo','Asia/Singapore','Australia/Sydney'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function ScheduleCheckNode({ config = {}, updateConfig }) {
  const timezone    = config.timezone    ?? 'Asia/Kolkata';
  const startTime   = config.startTime   ?? '09:00';
  const endTime     = config.endTime     ?? '18:00';
  const days        = config.days        ?? ['Mon','Tue','Wed','Thu','Fri'];
  const failIfOut   = config.failIfOut   ?? false;
  const excludeDates= config.excludeDates?? '';
  const includeDates= config.includeDates?? '';

  const toggleDay = (d) => {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
    updateConfig('days', next);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Clock className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Schedule Check</div>
          <div className="text-[11px] text-zinc-500">Is it currently within business hours?</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Timezone</label>
        <select value={timezone} onChange={(e) => updateConfig('timezone', e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Start Time</label>
          <input type="time" value={startTime} onChange={(e) => updateConfig('startTime', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">End Time</label>
          <input type="time" value={endTime} onChange={(e) => updateConfig('endTime', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Working Days</label>
        <div className="flex gap-1.5">
          {DAYS.map((d) => (
            <button key={d} onClick={() => toggleDay(d)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${days.includes(d) ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Holiday Dates to Exclude (comma-separated YYYY-MM-DD)</label>
        <SmartVariableInput value={excludeDates} onChange={(v) => updateConfig('excludeDates', v)}
          placeholder="2024-01-26, 2024-08-15, 2024-10-02" />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Extra Working Dates to Include (comma-separated)</label>
        <SmartVariableInput value={includeDates} onChange={(v) => updateConfig('includeDates', v)}
          placeholder="2024-01-27" />
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Stop if Outside Hours</p>
          <p className="text-[10px] text-zinc-600">Route to false/error path when out of schedule</p>
        </div>
        <button onClick={() => updateConfig('failIfOut', !failIfOut)}
          className={`w-10 h-5 rounded-full border transition-all relative ${failIfOut ? 'bg-amber-500 border-amber-400' : 'bg-zinc-700 border-zinc-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${failIfOut ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">isWithinHours (bool), currentTime, timezone, nextWindowStart</span>
      </div>
    </div>
  );
}
