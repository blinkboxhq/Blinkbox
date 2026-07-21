import { CheckCircle2, ListChecks, Crosshair } from 'lucide-react';

export const DEFAULT_OPERATION = 'test';

export const OPERATIONS = [
  { value: 'test',    label: 'Test Pattern',   group: 'Match', icon: CheckCircle2 },
  { value: 'match',   label: 'Match All',      group: 'Match', icon: ListChecks },
  { value: 'extract', label: 'Extract Group',  group: 'Match', icon: Crosshair },
];
