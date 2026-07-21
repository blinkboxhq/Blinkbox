import { FileSpreadsheet, Braces } from 'lucide-react';

export const DEFAULT_OPERATION = 'toJson';

export const OPERATIONS = [
  { value: 'toJson', label: 'CSV to JSON', group: 'Convert', icon: Braces },
  { value: 'toCsv',  label: 'JSON to CSV', group: 'Convert', icon: FileSpreadsheet },
];
