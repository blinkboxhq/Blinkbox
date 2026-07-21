import {
  Search, Upload, Trash2, Download, Pencil, BarChart3, List,
  Boxes, FileText, Plus, Ban,
} from 'lucide-react';

export const DEFAULT_OPERATION = 'query';

export const OPERATIONS = [
  { value: 'query',              label: 'Query Vectors',      group: 'Vectors', icon: Search },
  { value: 'upsert',             label: 'Upsert Vectors',     group: 'Vectors', icon: Upload },
  { value: 'update',             label: 'Update Vector',      group: 'Vectors', icon: Pencil },
  { value: 'fetchById',          label: 'Fetch By ID',        group: 'Vectors', icon: Download },
  { value: 'listVectors',        label: 'List Vector IDs',    group: 'Vectors', icon: List },
  { value: 'delete',             label: 'Delete Vectors',     group: 'Vectors', icon: Trash2 },
  { value: 'describeIndexStats', label: 'Get Index Stats',    group: 'Vectors', icon: BarChart3 },
  { value: 'listIndexes',        label: 'List Indexes',       group: 'Indexes', icon: Boxes },
  { value: 'describeIndex',      label: 'Describe Index',     group: 'Indexes', icon: FileText },
  { value: 'createIndex',        label: 'Create Index',       group: 'Indexes', icon: Plus },
  { value: 'deleteIndex',        label: 'Delete Index',       group: 'Indexes', icon: Ban },
];
