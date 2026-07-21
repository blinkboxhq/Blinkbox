import {
  FileText, Save, Plus, Pencil, Trash2, Search, ArrowUp, Layers, Boxes, Sigma,
  User, UserPlus, UserMinus, UserCog, Users, ShieldCheck, KeyRound,
  Bell, Megaphone, BellPlus, BellOff,
} from 'lucide-react';

export const DEFAULT_OPERATION = 'getDocument';

export const OPERATIONS = [
  { value: 'getDocument',         label: 'Get Document',        group: 'Firestore', icon: FileText },
  { value: 'setDocument',         label: 'Set Document',        group: 'Firestore', icon: Save },
  { value: 'addDocument',         label: 'Add Document',        group: 'Firestore', icon: Plus },
  { value: 'updateDocument',      label: 'Update Document',     group: 'Firestore', icon: Pencil },
  { value: 'deleteDocument',      label: 'Delete Document',     group: 'Firestore', icon: Trash2 },
  { value: 'queryCollection',     label: 'Query Collection',    group: 'Firestore', icon: Search },
  { value: 'countCollection',     label: 'Count Documents',     group: 'Firestore', icon: Sigma },
  { value: 'incrementField',      label: 'Increment Field',     group: 'Firestore', icon: ArrowUp },
  { value: 'batchSet',            label: 'Batch Set Documents', group: 'Firestore', icon: Layers },
  { value: 'listCollections',     label: 'List Collections',    group: 'Firestore', icon: Boxes },

  { value: 'getUser',             label: 'Get User',            group: 'Auth',      icon: User },
  { value: 'listUsers',           label: 'List Users',          group: 'Auth',      icon: Users },
  { value: 'createUser',          label: 'Create User',         group: 'Auth',      icon: UserPlus },
  { value: 'updateUser',          label: 'Update User',         group: 'Auth',      icon: UserCog },
  { value: 'deleteUser',          label: 'Delete User',         group: 'Auth',      icon: UserMinus },
  { value: 'setCustomClaims',     label: 'Set Custom Claims',   group: 'Auth',      icon: ShieldCheck },
  { value: 'createCustomToken',   label: 'Create Custom Token', group: 'Auth',      icon: KeyRound },

  { value: 'sendToToken',         label: 'Send Notification',   group: 'Messaging', icon: Bell },
  { value: 'sendToTopic',         label: 'Send To Topic',       group: 'Messaging', icon: Megaphone },
  { value: 'subscribeToTopic',    label: 'Subscribe To Topic',  group: 'Messaging', icon: BellPlus },
  { value: 'unsubscribeFromTopic', label: 'Unsubscribe From Topic', group: 'Messaging', icon: BellOff },
];
