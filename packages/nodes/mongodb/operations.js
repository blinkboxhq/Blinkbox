import {
  Search, Eye, Sigma, Gauge, Layers, Filter, Pencil, Trash2, Boxes,
  Plus, ListPlus, Copy, SquareStack, Key, List, Ban,
} from 'lucide-react';

export const DEFAULT_OPERATION = 'find';

export const OPERATIONS = [
  { value: 'find',                    label: 'Find Documents',      group: 'Read',    icon: Search },
  { value: 'findOne',                 label: 'Find One Document',   group: 'Read',    icon: Eye },
  { value: 'countDocuments',          label: 'Count Documents',     group: 'Read',    icon: Sigma },
  { value: 'estimatedDocumentCount',  label: 'Estimate Count',      group: 'Read',    icon: Gauge },
  { value: 'aggregate',               label: 'Run Aggregation',     group: 'Read',    icon: Layers },
  { value: 'distinct',                label: 'Distinct Values',     group: 'Read',    icon: Filter },
  { value: 'listCollections',         label: 'List Collections',    group: 'Read',    icon: Boxes },
  { value: 'insertOne',               label: 'Insert Document',     group: 'Write',   icon: Plus },
  { value: 'insertMany',              label: 'Insert Many',         group: 'Write',   icon: ListPlus },
  { value: 'updateOne',               label: 'Update Document',     group: 'Write',   icon: Pencil },
  { value: 'updateMany',              label: 'Update Many',         group: 'Write',   icon: Pencil },
  { value: 'replaceOne',              label: 'Replace Document',    group: 'Write',   icon: Copy },
  { value: 'deleteOne',               label: 'Delete Document',     group: 'Write',   icon: Trash2 },
  { value: 'deleteMany',              label: 'Delete Many',         group: 'Write',   icon: Ban },
  { value: 'findOneAndUpdate',        label: 'Find & Update',       group: 'Write',   icon: Pencil },
  { value: 'findOneAndDelete',        label: 'Find & Delete',       group: 'Write',   icon: Trash2 },
  { value: 'bulkWrite',               label: 'Bulk Write',          group: 'Write',   icon: SquareStack },
  { value: 'createIndex',             label: 'Create Index',        group: 'Indexes', icon: Key },
  { value: 'listIndexes',             label: 'List Indexes',        group: 'Indexes', icon: List },
  { value: 'dropIndex',               label: 'Drop Index',          group: 'Indexes', icon: Trash2 },
];
