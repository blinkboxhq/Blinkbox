import {
  Search, Eye, Plus, Pencil, ArrowUpDown, Trash2, Sigma, Ban,
  Terminal, Users, UserPlus, UserMinus, Mail, Boxes, Folder, Link2, Globe, FileText,
} from 'lucide-react';

export const DEFAULT_OPERATION = 'select';

export const OPERATIONS = [
  { value: 'select',         label: 'Select Rows',        group: 'Table',   icon: Search },
  { value: 'selectSingle',   label: 'Select One Row',     group: 'Table',   icon: Eye },
  { value: 'insert',         label: 'Insert Rows',        group: 'Table',   icon: Plus },
  { value: 'update',         label: 'Update Rows',        group: 'Table',   icon: Pencil },
  { value: 'upsert',         label: 'Upsert Rows',        group: 'Table',   icon: ArrowUpDown },
  { value: 'delete',         label: 'Delete Rows',        group: 'Table',   icon: Trash2 },
  { value: 'count',          label: 'Count Rows',         group: 'Table',   icon: Sigma },
  { value: 'deleteAll',      label: 'Delete All Rows',    group: 'Table',   icon: Ban },
  { value: 'rpc',            label: 'Call Function',      group: 'RPC',     icon: Terminal },
  { value: 'getUser',        label: 'Get User',           group: 'Auth',    icon: Users },
  { value: 'listUsers',      label: 'List Users',         group: 'Auth',    icon: Users },
  { value: 'createUser',     label: 'Create User',        group: 'Auth',    icon: UserPlus },
  { value: 'deleteUser',     label: 'Delete User',        group: 'Auth',    icon: UserMinus },
  { value: 'inviteUser',     label: 'Invite User',        group: 'Auth',    icon: Mail },
  { value: 'listBuckets',    label: 'List Buckets',       group: 'Storage', icon: Boxes },
  { value: 'listFiles',      label: 'List Files',         group: 'Storage', icon: Folder },
  { value: 'createSignedUrl', label: 'Create Signed URL', group: 'Storage', icon: Link2 },
  { value: 'getPublicUrl',   label: 'Get Public URL',     group: 'Storage', icon: Globe },
  { value: 'deleteFile',     label: 'Delete File',        group: 'Storage', icon: FileText },
];
