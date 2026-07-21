import { Braces, FileJson, Crosshair, KeyRound, List } from 'lucide-react';

export const DEFAULT_OPERATION = 'extract';

export const OPERATIONS = [
  { value: 'extract',   label: 'Extract Value', group: 'Read',    icon: Crosshair },
  { value: 'keys',      label: 'List Keys',     group: 'Read',    icon: KeyRound },
  { value: 'values',    label: 'List Values',   group: 'Read',    icon: List },
  { value: 'parse',     label: 'Parse JSON',    group: 'Convert', icon: Braces },
  { value: 'stringify', label: 'Stringify',     group: 'Convert', icon: FileJson },
];
