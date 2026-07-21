import { Save, Download, Trash2, List } from 'lucide-react';

export const DEFAULT_OPERATION = 'set';

export const OPERATIONS = [
  { value: 'set',    label: 'Set Variable',     group: 'Variable', icon: Save },
  { value: 'get',    label: 'Get Variable',     group: 'Variable', icon: Download },
  { value: 'delete', label: 'Delete Variable',  group: 'Variable', icon: Trash2 },
  { value: 'list',   label: 'List Variables',   group: 'Variable', icon: List },
];
