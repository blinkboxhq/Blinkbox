import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Plus, Clock, ChevronDown } from 'lucide-react';

// Human-friendly presets → cron expression
const INTERVAL_PRESETS = [
  { label: 'Every minute',    value: 'every_minute',  cron: '* * * * *' },
  { label: 'Every 5 minutes', value: 'every_5m',      cron: '*/5 * * * *' },
  { label: 'Every 15 minutes',value: 'every_15m',     cron: '*/15 * * * *' },
  { label: 'Every 30 minutes',value: 'every_30m',     cron: '*/30 * * * *' },
  { label: 'Every hour',      value: 'every_hour',    cron: '0 * * * *' },
  { label: 'Every 6 hours',   value: 'every_6h',      cron: '0 */6 * * *' },
  { label: 'Every 12 hours',  value: 'every_12h',     cron: '0 */12 * * *' },
  { label: 'Once a day',      value: 'daily',         cron: '0 9 * * *' },
  { label: 'Once a week',     value: 'weekly',        cron: '0 9 * * 1' },
  { label: 'Custom (cron)',   value: 'custom',        cron: null },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_CRON = { Mon: '1', Tue: '2', Wed: '3', Thu: '4', Fri: '5', Sat: '6', Sun: '0' };

const TIMEZONES = [
  { value: 'UTC',                  label: 'UTC' },
  { value: 'America/New_York',     label: 'New York (EST/EDT)' },
  { value: 'America/Los_Angeles',  label: 'Los Angeles (PST/PDT)' },
  { value: 'America/Chicago',      label: 'Chicago (CST/CDT)' },
  { value: 'Europe/London',        label: 'London (GMT/BST)' },
  { value: 'Europe/Paris',         label: 'Paris (CET/CEST)' },
  { value: 'Asia/Kolkata',         label: 'Mumbai (IST)' },
  { value: 'Asia/Tokyo',           label: 'Tokyo (JST)' },
  { value: 'Asia/Singapore',       label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney',     label: 'Sydney (AEST/AEDT)' },
];

function pad(n) { return String(n).padStart(2, '0'); }

function hourOptions() {
  return Array.from({ length: 24 }, (_, i) => ({ value: pad(i), label: `${pad(i)}:00` }));
}

export default function ScheduleTriggerNode({ config = {}, updateConfig, selected }) {
  const preset = config.preset || 'every_hour';
  const timezone = config.timezone || 'UTC';
  const customCron = config.customCron || '0 * * * *';
  const selectedDays = config.selectedDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const dailyHour = config.dailyHour || '09';

  const currentPreset = INTERVAL_PRESETS.find((p) => p.value === preset) || INTERVAL_PRESETS[5];
  const isCustom = preset === 'custom';
  const isWeekly = preset === 'weekly';
  const isDaily = preset === 'daily';

  // Derive live cron expression for display
  const liveCron = (() => {
    if (isCustom) return customCron;
    if (isDaily) return `0 ${dailyHour} * * *`;
    if (isWeekly) {
      const days = selectedDays.map((d) => DAY_CRON[d]).join(',');
      return `0 ${dailyHour} * * ${days || '*'}`;
    }
    return currentPreset.cron;
  })();

  const setPreset = (val) => {
    updateConfig?.('preset', val);
    // Also store the derived cron so the backend gets it
    const p = INTERVAL_PRESETS.find((x) => x.value === val);
    if (p?.cron) updateConfig?.('schedule', p.cron);
  };

  const toggleDay = (day) => {
    const days = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];
    updateConfig?.('selectedDays', days);
    // Update cron expression
    const dayStr = days.map((d) => DAY_CRON[d]).join(',');
    updateConfig?.('schedule', `0 ${dailyHour} * * ${dayStr || '*'}`);
  };

  const setHour = (h) => {
    updateConfig?.('dailyHour', h);
    if (isWeekly) {
      const dayStr = selectedDays.map((d) => DAY_CRON[d]).join(',');
      updateConfig?.('schedule', `0 ${h} * * ${dayStr || '*'}`);
    } else if (isDaily) {
      updateConfig?.('schedule', `0 ${h} * * *`);
    }
  };

  return (
    <div className={`relative flex flex-col w-[280px] bg-[#0A0A0A] rounded-xl border transition-colors shadow-2xl font-sans group ${selected ? 'border-amber-500/50' : 'border-[#2A2A2A]'}`}>

      <Handle
        id="output"
        type="source"
        position={Position.Right}
        className="!w-5 !h-5 !flex items-center justify-center !bg-[#111111] !border !border-[#2A2A2A] !rounded-full !opacity-0 group-hover:!opacity-100 transition-all hover:!bg-amber-500 hover:!border-amber-500 text-zinc-500 hover:text-white shadow-xl z-50 cursor-crosshair"
        style={{ top: '20px', right: '-10px', transform: 'translateY(-50%)' }}
      >
        <Plus className="w-3 h-3 pointer-events-none" />
      </Handle>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#222] rounded-md border border-[#333]">
            <Clock className="w-3 h-3 text-amber-400" />
          </div>
          <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Schedule Trigger</span>
        </div>
        {/* Live cron badge */}
        <span className="text-[9px] font-mono text-zinc-600 bg-[#161616] border border-[#222] rounded px-1.5 py-0.5">{liveCron}</span>
      </div>

      <div className="p-3 flex flex-col gap-3">

        {/* Interval picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Run every</label>
          <div className="relative">
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="w-full appearance-none bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer pr-7"
            >
              {INTERVAL_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
          </div>
        </div>

        {/* Day picker for weekly */}
        {isWeekly && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">On these days</label>
            <div className="flex gap-1">
              {DAYS.map((d) => {
                const on = selectedDays.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => toggleDay(d)}
                    className={`flex-1 py-1 rounded-md text-[9px] font-bold transition-all border ${on ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'bg-[#111] border-[#222] text-zinc-600 hover:text-zinc-400'}`}
                  >
                    {d[0]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Hour picker for daily / weekly */}
        {(isDaily || isWeekly) && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">At time</label>
            <div className="relative">
              <select
                value={dailyHour}
                onChange={(e) => setHour(e.target.value)}
                className="w-full appearance-none bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer pr-7"
              >
                {hourOptions().map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Custom cron */}
        {isCustom && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Cron Expression</label>
            <input
              value={customCron}
              onChange={(e) => {
                updateConfig?.('customCron', e.target.value);
                updateConfig?.('schedule', e.target.value);
              }}
              placeholder="0 9 * * 1-5"
              className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500/50 transition-colors"
            />
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Weekdays 9am', val: '0 9 * * 1-5' },
                { label: 'Every hour',   val: '0 * * * *' },
                { label: 'Daily midnight', val: '0 0 * * *' },
              ].map((s) => (
                <button
                  key={s.val}
                  onClick={() => { updateConfig?.('customCron', s.val); updateConfig?.('schedule', s.val); }}
                  className="text-[9px] bg-[#161616] hover:bg-[#222] text-zinc-500 hover:text-zinc-300 px-1.5 py-1 rounded border border-[#2A2A2A] transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Timezone */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Timezone</label>
          <div className="relative">
            <select
              value={timezone}
              onChange={(e) => updateConfig?.('timezone', e.target.value)}
              className="w-full appearance-none bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer pr-7"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
          </div>
        </div>

        {/* Variables */}
        <div className="flex flex-col gap-1 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-0.5">Available in workflow as</span>
          {[
            ['$trigger.triggeredAt', 'ISO timestamp when cron fired'],
            ['$trigger.schedule', 'Cron expression (e.g. "0 9 * * *")'],
            ['$trigger.timezone', 'Configured timezone string'],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-baseline gap-2">
              <span className="text-[10px] font-mono text-amber-400 shrink-0">{key}</span>
              <span className="text-[9px] text-zinc-600">{desc}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
