import { Clock } from 'lucide-react';
import { ConfigSection, ConfigLabel, ConfigSelect, ConfigInput } from '@/components/ui/ConfigKit';

const ACCENT = '#f5b542';

const INTERVAL_PRESETS = [
  { label: 'Every minute',     value: 'every_minute', cron: '* * * * *' },
  { label: 'Every 5 minutes',  value: 'every_5m',     cron: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: 'every_15m',    cron: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: 'every_30m',    cron: '*/30 * * * *' },
  { label: 'Every hour',       value: 'every_hour',   cron: '0 * * * *' },
  { label: 'Every 6 hours',    value: 'every_6h',     cron: '0 */6 * * *' },
  { label: 'Every 12 hours',   value: 'every_12h',    cron: '0 */12 * * *' },
  { label: 'Once a day',       value: 'daily',        cron: '0 9 * * *' },
  { label: 'Once a week',      value: 'weekly',       cron: '0 9 * * 1' },
  { label: 'Custom (cron)',    value: 'custom',       cron: null },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_CRON = { Mon: '1', Tue: '2', Wed: '3', Thu: '4', Fri: '5', Sat: '6', Sun: '0' };

const TIMEZONES = [
  { value: 'UTC',                 label: 'UTC' },
  { value: 'America/New_York',    label: 'New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'America/Chicago',     label: 'Chicago (CST/CDT)' },
  { value: 'Europe/London',       label: 'London (GMT/BST)' },
  { value: 'Europe/Paris',        label: 'Paris (CET/CEST)' },
  { value: 'Asia/Kolkata',        label: 'Mumbai (IST)' },
  { value: 'Asia/Tokyo',          label: 'Tokyo (JST)' },
  { value: 'Asia/Singapore',      label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney',    label: 'Sydney (AEST/AEDT)' },
];

const QUICK_CRON = [
  { label: 'Weekdays 9am',   val: '0 9 * * 1-5' },
  { label: 'Every hour',     val: '0 * * * *' },
  { label: 'Daily midnight', val: '0 0 * * *' },
];

const pad = (n) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => ({ value: pad(i), label: `${pad(i)}:00` }));

const VARS = [
  ['$trigger.triggeredAt', 'ISO timestamp when the schedule fired'],
  ['$trigger.schedule', 'Cron expression (e.g. "0 9 * * *")'],
  ['$trigger.timezone', 'Configured timezone string'],
];

export default function ScheduleTriggerNode({ config = {}, updateConfig }) {
  const preset = config.preset || 'every_hour';
  const timezone = config.timezone || 'UTC';
  const customCron = config.customCron || '0 * * * *';
  const selectedDays = config.selectedDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const dailyHour = config.dailyHour || '09';

  const currentPreset = INTERVAL_PRESETS.find((p) => p.value === preset) || INTERVAL_PRESETS[4];
  const isCustom = preset === 'custom';
  const isWeekly = preset === 'weekly';
  const isDaily = preset === 'daily';

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
    const p = INTERVAL_PRESETS.find((x) => x.value === val);
    if (p?.cron) updateConfig?.('schedule', p.cron);
  };

  const toggleDay = (day) => {
    const days = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];
    updateConfig?.('selectedDays', days);
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
    <ConfigSection className="gap-5">
      {/* Header */}
      <div className="bb-glow-border flex items-center justify-between gap-3 p-4 rounded-md bg-[#0f0f0f] border border-[#3b3b3b]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#262626] border border-[#3b3b3b] flex items-center justify-center shrink-0 text-white">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-neutral-100 font-mono tracking-wide">Schedule</span>
            <span className="text-[10px] text-neutral-500 font-mono">Run this workflow on a timer</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-neutral-400 bg-[#0f0f0f] border border-[#2b2b2b] rounded px-2 py-1 shrink-0">{liveCron}</span>
      </div>

      {/* Interval */}
      <ConfigSelect
        label="Run Every"
        value={preset}
        onChange={setPreset}
        options={INTERVAL_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
        accentColor={ACCENT}
      />

      {/* Day picker — weekly only */}
      {isWeekly && (
        <div className="flex flex-col">
          <ConfigLabel>On These Days</ConfigLabel>
          <div className="flex gap-1.5">
            {DAYS.map((d) => {
              const on = selectedDays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className="bb-glow-border flex-1 py-2 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border transition-colors"
                  style={on
                    ? { color: ACCENT, backgroundColor: `${ACCENT}1f`, borderColor: `${ACCENT}66` }
                    : { color: '#6d6d6d', backgroundColor: '#0f0f0f', borderColor: '#2b2b2b' }}
                >
                  {d[0]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hour picker — daily / weekly */}
      {(isDaily || isWeekly) && (
        <ConfigSelect
          label="At Time"
          value={dailyHour}
          onChange={setHour}
          options={HOURS}
          accentColor={ACCENT}
        />
      )}

      {/* Custom cron */}
      {isCustom && (
        <div className="flex flex-col">
          <ConfigInput
            label="Cron Expression"
            value={customCron}
            onChange={(v) => { updateConfig?.('customCron', v); updateConfig?.('schedule', v); }}
            placeholder="0 9 * * 1-5"
            hint="// minute hour day-of-month month day-of-week"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {QUICK_CRON.map((s) => (
              <button
                key={s.val}
                type="button"
                onClick={() => { updateConfig?.('customCron', s.val); updateConfig?.('schedule', s.val); }}
                className="bb-glow-border text-[10px] font-mono text-neutral-500 hover:text-neutral-200 px-2.5 py-1.5 rounded-md bg-[#0f0f0f] border border-[#2b2b2b] transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timezone */}
      <ConfigSelect
        label="Timezone"
        value={timezone}
        onChange={(v) => updateConfig?.('timezone', v)}
        options={TIMEZONES}
        accentColor={ACCENT}
      />

      {/* Output variables */}    </ConfigSection>
  );
}
