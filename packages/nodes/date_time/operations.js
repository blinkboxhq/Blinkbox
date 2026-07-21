import { Clock, CalendarDays, ScanLine, CalendarPlus, CalendarMinus, GitCompareArrows, Globe } from 'lucide-react';

export const DEFAULT_OPERATION = 'now';

export const OPERATIONS = [
  { value: 'now',      label: 'Current Time',      group: 'Read',      icon: Clock },
  { value: 'format',   label: 'Format Date',       group: 'Read',      icon: CalendarDays },
  { value: 'parse',    label: 'Parse Date',        group: 'Read',      icon: ScanLine },
  { value: 'add',      label: 'Add Duration',      group: 'Math',      icon: CalendarPlus },
  { value: 'subtract', label: 'Subtract Duration', group: 'Math',      icon: CalendarMinus },
  { value: 'diff',     label: 'Date Difference',   group: 'Math',      icon: GitCompareArrows },
  { value: 'convert',  label: 'Convert Timezone',  group: 'Timezone',  icon: Globe },
];
