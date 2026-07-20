import { useMemo } from 'react';
import { CheckCheck, XCircle, GitFork, Check, X } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import useWorkspaceStore from '@/store/workspaceStore';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, AddRow, RemovableRow,
} from '@/components/ui/ConfigKit';

const ACCENT = '#34d399';

const OPERATORS = [
  { value: 'equals',      label: 'is',                  desc: 'text' },
  { value: 'notEquals',   label: 'is not',              desc: 'text' },
  { value: 'contains',    label: 'contains',            desc: 'text' },
  { value: 'notContains', label: 'does not contain',    desc: 'text' },
  { value: 'startsWith',  label: 'starts with',         desc: 'text' },
  { value: 'endsWith',    label: 'ends with',           desc: 'text' },
  { value: 'regex',       label: 'matches pattern',     desc: 'regex' },
  { value: 'notRegex',    label: 'does not match',      desc: 'regex' },
  { value: 'gt',          label: 'is greater than',     desc: 'number' },
  { value: 'gte',         label: 'is greater or equal', desc: 'number' },
  { value: 'lt',          label: 'is less than',        desc: 'number' },
  { value: 'lte',         label: 'is less or equal',    desc: 'number' },
  { value: 'in',          label: 'is one of',           desc: 'list' },
  { value: 'notIn',       label: 'is not one of',       desc: 'list' },
  { value: 'isTrue',      label: 'is true',             desc: 'state' },
  { value: 'isFalse',     label: 'is false',            desc: 'state' },
  { value: 'exists',      label: 'exists',              desc: 'state' },
  { value: 'notExists',   label: 'does not exist',      desc: 'state' },
  { value: 'isEmpty',     label: 'is empty',            desc: 'state' },
  { value: 'isNotEmpty',  label: 'is not empty',        desc: 'state' },
];

const UNARY = new Set(['isTrue', 'isFalse', 'exists', 'notExists', 'isEmpty', 'isNotEmpty']);

const MODES = [
  { value: 'and', label: 'All conditions' },
  { value: 'or',  label: 'Any condition' },
];

const RIGHT_PLACEHOLDER = {
  regex: '^ORD-\\d+$',
  notRegex: '^test-',
  in: 'paid, shipped, refunded',
  notIn: 'cancelled, refunded',
  gt: '100',
  gte: '100',
  lt: '100',
  lte: '100',
};

const emptyCondition = () => ({ left: '', operator: 'equals', right: '' });

// Mirrors apps/backend/src/modules/automation/engine/condition.evaluator.js so the
// panel can show which path a real payload would take. Keep the two in sync.

const TOKEN_RE = /\{\{([\s\S]+?)\}\}/g;

function resolveToken(outputs, path) {
  const parts = String(path).trim().split('.');
  let value = outputs?.[parts[0]];
  for (const key of parts.slice(1)) {
    if (value == null || typeof value !== 'object') return undefined;
    value = value[key];
  }
  return value;
}

function resolveValue(raw, outputs) {
  if (typeof raw !== 'string') return raw;
  const exact = raw.match(/^\{\{([\s\S]+?)\}\}$/);
  if (exact) return resolveToken(outputs, exact[1]);
  return raw.replace(TOKEN_RE, (_, p) => {
    const v = resolveToken(outputs, p);
    return v == null ? '' : String(v);
  });
}

function toList(value) {
  if (Array.isArray(value)) return value;
  return String(value ?? '').split(',').map((v) => v.trim()).filter(Boolean);
}

function isNumeric(v) {
  return v !== null && v !== '' && typeof v !== 'boolean' && !Number.isNaN(Number(v));
}

function ordered(l, r, cmp) {
  if (isNumeric(l) && isNumeric(r)) return cmp(Number(l), Number(r));
  const ld = Date.parse(l);
  const rd = Date.parse(r);
  if (!Number.isNaN(ld) && !Number.isNaN(rd)) return cmp(ld, rd);
  return cmp(Number(l), Number(r));
}

function safeRegex(pattern, subject) {
  const p = String(pattern ?? '');
  if (!p || p.length > 200) return false;
  try { return new RegExp(p).test(String(subject ?? '').slice(0, 10000)); } catch { return false; }
}

function evalOne(condition, outputs) {
  const l = resolveValue(condition.left, outputs);
  const r = resolveValue(condition.right, outputs);
  switch (condition.operator) {
    case 'equals':      return l == r;
    case 'notEquals':   return l != r;
    case 'contains':    return String(l).includes(String(r));
    case 'notContains': return !String(l).includes(String(r));
    case 'startsWith':  return String(l).startsWith(String(r));
    case 'endsWith':    return String(l).endsWith(String(r));
    case 'regex':       return safeRegex(r, l);
    case 'notRegex':    return !safeRegex(r, l);
    case 'gt':          return ordered(l, r, (a, b) => a > b);
    case 'gte':         return ordered(l, r, (a, b) => a >= b);
    case 'lt':          return ordered(l, r, (a, b) => a < b);
    case 'lte':         return ordered(l, r, (a, b) => a <= b);
    case 'in':          return toList(r).some((v) => v == l);
    case 'notIn':       return !toList(r).some((v) => v == l);
    case 'isTrue':      return l === true || l === 'true' || l === 1 || l === '1';
    case 'isFalse':     return l === false || l === 'false' || l === 0 || l === '0';
    case 'exists':      return l !== undefined && l !== null;
    case 'notExists':   return l === undefined || l === null;
    case 'isEmpty':     return l === undefined || l === null || l === '' || (Array.isArray(l) && l.length === 0);
    case 'isNotEmpty':  return l !== undefined && l !== null && l !== '' && !(Array.isArray(l) && l.length === 0);
    default:            return false;
  }
}

function previewText(value) {
  if (value === undefined) return null;
  if (value === null) return 'null';
  if (typeof value === 'object') return Array.isArray(value) ? `[${value.length} items]` : '{…}';
  const s = String(value);
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}

export default function ConditionNode({ config = {}, updateConfig, nodeId }) {
  const lastRunOutputs = useWorkspaceStore((s) => s.lastRunOutputs ?? {});

  const conditions = useMemo(() => {
    if (Array.isArray(config.conditions) && config.conditions.length > 0) return config.conditions;
    if (config.condition?.operator) return [config.condition];
    return [emptyCondition()];
  }, [config.conditions, config.condition]);

  const mode = config.mode === 'or' ? 'or' : 'and';

  const write = (next) => {
    updateConfig('conditions', next);
    if (config.condition) updateConfig('condition', undefined);
  };

  const setAt = (i, updated) => write(conditions.map((c, idx) => (idx === i ? updated : c)));
  const removeAt = (i) => write(conditions.filter((_, idx) => idx !== i));
  const add = () => write([...conditions, emptyCondition()]);

  const results = useMemo(
    () => conditions.map((c) => (c.left || UNARY.has(c.operator) ? evalOne(c, lastRunOutputs) : null)),
    [conditions, lastRunOutputs]
  );

  const hasLive =
    Object.keys(lastRunOutputs).length > 0 &&
    conditions.some((c) => c.left && resolveValue(c.left, lastRunOutputs) !== undefined);

  const verdict = hasLive
    ? (mode === 'or' ? results.some((r) => r === true) : results.every((r) => r !== false))
    : null;

  return (
    <ConfigSection className="gap-5">
      <ConfigHeader
        icon={GitFork}
        iconColor={ACCENT}
        title="Condition"
        subtitle="Send the run down the TRUE or FALSE path"
      />

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <PathChip tone="true" active={verdict === true} dim={verdict === false} label="TRUE path" />
          <PathChip tone="false" active={verdict === false} dim={verdict === true} label="FALSE path" />
        </div>
        {hasLive && (
          <p className="text-[10px] text-neutral-500 font-mono">
            With the last run's data this goes{' '}
            <span className={verdict ? 'text-emerald-400' : 'text-red-400'}>
              {verdict ? 'TRUE' : 'FALSE'}
            </span>
          </p>
        )}
      </div>

      {conditions.length > 1 && (
        <ConfigPills
          label="Must match"
          value={mode}
          onChange={(v) => updateConfig('mode', v)}
          options={MODES}
          accentColor={ACCENT}
        />
      )}

      <div className="flex flex-col gap-2">
        <ConfigLabel>{conditions.length > 1 ? 'Conditions' : 'Condition'}</ConfigLabel>

        {conditions.map((c, i) => (
          <div key={i} className="flex flex-col gap-2">
            {i > 0 && (
              <div className="flex items-center gap-2 py-0.5">
                <div className="flex-1 h-px bg-neutral-800" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">
                  {mode}
                </span>
                <div className="flex-1 h-px bg-neutral-800" />
              </div>
            )}
            <ConditionRow
              condition={c}
              result={results[i]}
              outputs={lastRunOutputs}
              nodeId={nodeId}
              onChange={(updated) => setAt(i, updated)}
              onRemove={conditions.length > 1 ? () => removeAt(i) : null}
            />
          </div>
        ))}

        <AddRow label="Add condition" onClick={add} accentColor={ACCENT} />
      </div>
    </ConfigSection>
  );
}

function PathChip({ tone, active, dim, label }) {
  const isTrue = tone === 'true';
  const Icon = isTrue ? CheckCheck : XCircle;
  const base = isTrue
    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
    : 'bg-red-500/10 border-red-500/20 text-red-400';
  const on = isTrue
    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
    : 'bg-red-500/20 border-red-500/50 text-red-300';
  return (
    <div
      className={`flex-1 flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all duration-150 ${
        active ? on : base
      } ${dim ? 'opacity-35' : ''}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="text-[11px] font-bold">{label}</span>
    </div>
  );
}

function ConditionRow({ condition, result, outputs, nodeId, onChange, onRemove }) {
  const needsRight = !UNARY.has(condition.operator);
  const leftValue = condition.left ? previewText(resolveValue(condition.left, outputs)) : null;

  const body = (
    <div className="flex flex-col gap-1.5">
      <SmartVariableInput
        value={condition.left || ''}
        onChange={(v) => onChange({ ...condition, left: v })}
        placeholder="Drag a field here"
        nodeId={nodeId}
      />

      <div className="flex items-center gap-1.5">
        <div className="flex-1 min-w-0">
          <ConfigSelect
            value={condition.operator}
            onChange={(v) => onChange({ ...condition, operator: v })}
            options={OPERATORS}
            accentColor={ACCENT}
          />
        </div>
        {result !== null && (
          <span
            className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center ${
              result ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}
            title={result ? 'Passes with the last run' : 'Fails with the last run'}
          >
            {result ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
          </span>
        )}
      </div>

      {needsRight && (
        <SmartVariableInput
          value={condition.right || ''}
          onChange={(v) => onChange({ ...condition, right: v })}
          placeholder={RIGHT_PLACEHOLDER[condition.operator] || 'value'}
          nodeId={nodeId}
        />
      )}

      {leftValue !== null && (
        <p className="text-[9px] text-neutral-600 font-mono truncate">last run — {leftValue}</p>
      )}
    </div>
  );

  return onRemove ? <RemovableRow onRemove={onRemove}>{body}</RemovableRow> : body;
}
