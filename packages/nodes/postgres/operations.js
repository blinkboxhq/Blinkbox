import {
  Search, Eye, Terminal, Plus, Pencil, Trash2, ArrowUpDown, Layers, Repeat, Table, Columns,
} from 'lucide-react';

export const DEFAULT_OPERATION = 'query';

export const OPERATIONS = [
  { value: 'query',        label: 'Run Query',         group: 'Query',  icon: Search },
  { value: 'queryOne',     label: 'Query Single Row',  group: 'Query',  icon: Eye },
  { value: 'execute',      label: 'Execute Statement', group: 'Query',  icon: Terminal },
  { value: 'insert',       label: 'Insert Row',        group: 'Rows',   icon: Plus },
  { value: 'update',       label: 'Update Rows',       group: 'Rows',   icon: Pencil },
  { value: 'deleteRows',   label: 'Delete Rows',       group: 'Rows',   icon: Trash2 },
  { value: 'upsert',       label: 'Upsert Row',        group: 'Rows',   icon: ArrowUpDown },
  { value: 'batch',        label: 'Run Batch',         group: 'Batch',  icon: Layers },
  { value: 'transaction',  label: 'Run Transaction',   group: 'Batch',  icon: Repeat },
  { value: 'listTables',   label: 'List Tables',       group: 'Schema', icon: Table },
  { value: 'tableColumns', label: 'List Columns',      group: 'Schema', icon: Columns },
];
