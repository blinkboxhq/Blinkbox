import { PlusSquare, PenLine, Filter, Trash2, Crosshair } from 'lucide-react';

export const DEFAULT_OPERATION = 'set';

export const OPERATIONS = [
  { value: 'set',    label: 'Set Fields',     group: 'Fields', icon: PlusSquare },
  { value: 'rename', label: 'Rename Fields',  group: 'Fields', icon: PenLine },
  { value: 'remove', label: 'Remove Fields',  group: 'Fields', icon: Trash2 },
  { value: 'pick',   label: 'Keep Only',      group: 'Fields', icon: Crosshair },
  { value: 'filter', label: 'Filter Array',   group: 'Array',  icon: Filter },
];
