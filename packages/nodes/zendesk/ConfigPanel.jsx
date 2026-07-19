import { useEffect } from 'react';
import imgZendesk from './logo.svg';
import {
  Ticket, Inbox, Plus, Pencil, Trash2, List, MessageSquare, UserCheck,
  CheckCircle2, Tag, Hash, History, ShieldAlert, GitMerge, Users, User,
  UserPlus, Search, Building2, Users2, Layers, Sliders, Zap, LayoutList,
  Eye, Star, BookOpen, FileText, FolderTree, Folder,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigToggleRow, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'listTickets', label: 'List Tickets', icon: Inbox },
  { value: 'getTicket', label: 'Get Ticket', icon: Ticket },
  { value: 'createTicket', label: 'Create Ticket', icon: Plus },
  { value: 'updateTicket', label: 'Update Ticket', icon: Pencil },
  { value: 'deleteTicket', label: 'Delete Ticket', icon: Trash2 },
  { value: 'addComment', label: 'Add Comment', icon: MessageSquare },
  { value: 'assignTicket', label: 'Assign Ticket', icon: UserCheck },
  { value: 'closeTicket', label: 'Close Ticket', icon: CheckCircle2 },
  { value: 'listTicketComments', label: 'List Comments', icon: List },
  { value: 'addTicketTags', label: 'Add Tags', icon: Tag },
  { value: 'removeTicketTags', label: 'Remove Tags', icon: Tag },
  { value: 'countTickets', label: 'Count Tickets', icon: Hash },
  { value: 'listTicketAudits', label: 'List Audits', icon: History },
  { value: 'markTicketSpam', label: 'Mark As Spam', icon: ShieldAlert },
  { value: 'mergeTickets', label: 'Merge Tickets', icon: GitMerge },
  { value: 'searchTickets', label: 'Search Tickets', icon: Search },
  { value: 'listUsers', label: 'List Users', icon: Users },
  { value: 'getUser', label: 'Get User', icon: User },
  { value: 'createUser', label: 'Create User', icon: UserPlus },
  { value: 'updateUser', label: 'Update User', icon: Pencil },
  { value: 'deleteUser', label: 'Delete User', icon: Trash2 },
  { value: 'createOrUpdateUser', label: 'Create/Update User', icon: UserCheck },
  { value: 'searchUsers', label: 'Search Users', icon: Search },
  { value: 'listUserTickets', label: "User's Tickets", icon: Ticket },
  { value: 'addUserTags', label: 'Add User Tags', icon: Tag },
  { value: 'listOrganizations', label: 'List Orgs', icon: Building2 },
  { value: 'getOrganization', label: 'Get Org', icon: Building2 },
  { value: 'createOrganization', label: 'Create Org', icon: Plus },
  { value: 'updateOrganization', label: 'Update Org', icon: Pencil },
  { value: 'deleteOrganization', label: 'Delete Org', icon: Trash2 },
  { value: 'searchOrganizations', label: 'Search Orgs', icon: Search },
  { value: 'listOrganizationTickets', label: "Org's Tickets", icon: Ticket },
  { value: 'listGroups', label: 'List Groups', icon: Users2 },
  { value: 'getGroup', label: 'Get Group', icon: Users2 },
  { value: 'createGroup', label: 'Create Group', icon: Plus },
  { value: 'updateGroup', label: 'Update Group', icon: Pencil },
  { value: 'deleteGroup', label: 'Delete Group', icon: Trash2 },
  { value: 'listTicketFields', label: 'List Fields', icon: Layers },
  { value: 'createTicketField', label: 'Create Field', icon: Sliders },
  { value: 'listMacros', label: 'List Macros', icon: Zap },
  { value: 'applyMacro', label: 'Apply Macro', icon: Zap },
  { value: 'listViews', label: 'List Views', icon: LayoutList },
  { value: 'executeView', label: 'Execute View', icon: Eye },
  { value: 'countView', label: 'Count View', icon: Hash },
  { value: 'search', label: 'Unified Search', icon: Search },
  { value: 'listSatisfactionRatings', label: 'Satisfaction', icon: Star },
  { value: 'listArticles', label: 'List Articles', icon: BookOpen },
  { value: 'getArticle', label: 'Get Article', icon: FileText },
  { value: 'createArticle', label: 'Create Article', icon: Plus },
  { value: 'updateArticle', label: 'Update Article', icon: Pencil },
  { value: 'deleteArticle', label: 'Delete Article', icon: Trash2 },
  { value: 'listSections', label: 'List Sections', icon: FolderTree },
  { value: 'createSection', label: 'Create Section', icon: Plus },
  { value: 'listCategories', label: 'List Categories', icon: Folder },
  { value: 'createCategory', label: 'Create Category', icon: Plus },
];

const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const STATUSES = ['new', 'open', 'pending', 'hold', 'solved', 'closed'];

const LIST_OPS = [
  'listTickets', 'listTicketComments', 'listTicketAudits', 'listUsers', 'searchUsers',
  'listUserTickets', 'listOrganizations', 'listOrganizationTickets', 'listGroups',
  'listMacros', 'listViews', 'executeView', 'search', 'searchTickets',
  'listSatisfactionRatings', 'listArticles', 'listSections', 'listCategories',
];

function Field({ label, optional, hint, children }) {
  return (
    <div className="flex flex-col">
      {label && (
        <ConfigLabel>
          {label}{optional && <span className="text-neutral-700 normal-case tracking-normal"> (optional)</span>}
        </ConfigLabel>
      )}
      {children}
      {hint && <p className="text-[10px] text-neutral-600 mt-1.5">{hint}</p>}
    </div>
  );
}

export default function ZendeskNode({ config = {}, updateConfig }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const op = LABEL_TO_OP[config.selectedAction] || config.operation || 'listTickets';

  useEffect(() => {
    if (op && op !== config.operation) updateConfig('operation', op);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op]);
  const currentOp = OPERATIONS.find((o) => o.value === op);
  const set = (k) => (v) => updateConfig(k, v);
  const show = (...ops) => ops.includes(op);

  const text = (label, key, opts = {}) => (
    <Field label={label} optional={opts.optional} hint={opts.hint}>
      <SmartVariableInput
        value={config[key] ?? opts.def ?? ''}
        onChange={set(key)}
        placeholder={opts.placeholder || ''}
        multiline={opts.multiline}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">

      {text('Subdomain', 'subdomain', { placeholder: 'mycompany', hint: 'From mycompany.zendesk.com → mycompany' })}


      {show('getTicket', 'updateTicket', 'deleteTicket', 'addComment', 'assignTicket', 'closeTicket', 'listTicketComments', 'addTicketTags', 'removeTicketTags', 'listTicketAudits', 'markTicketSpam', 'mergeTickets', 'applyMacro') &&
        text('Ticket ID', 'ticketId', { placeholder: '{{n1.id}}' })}

      {show('createTicket', 'updateTicket') && (
        <>
          {text('Subject', 'subject', { placeholder: '{{n1.subject}}' })}
          {text(show('createTicket') ? 'Description (body)' : 'Body', 'description', { optional: !show('createTicket'), placeholder: '{{n1.message}}', multiline: true })}
          {text('Requester Email', 'requesterEmail', { placeholder: '{{n1.email}}' })}
          <div className="grid grid-cols-2 gap-2">
            <ConfigPills label="Priority" value={config.priority ?? 'normal'} onChange={set('priority')} options={PRIORITIES} accentColor={ACCENT} />
            <ConfigPills label="Type" value={config.type ?? 'incident'} onChange={set('type')} options={['question', 'incident', 'problem', 'task']} accentColor={ACCENT} />
          </div>
          <ConfigPills label="Status" value={config.status ?? ''} onChange={set('status')} options={STATUSES} accentColor={ACCENT} />
          <div className="grid grid-cols-2 gap-2">
            {text('Assignee ID', 'assigneeId', { placeholder: '123' })}
            {text('Group ID', 'groupId', { placeholder: '456' })}
          </div>
          {text('Tags (comma-sep)', 'tags', { placeholder: 'urgent, billing' })}
        </>
      )}

      {show('addComment') && (
        <>
          {text('Comment Body', 'body', { placeholder: 'Thanks for reaching out...', multiline: true })}
          <ConfigToggleRow label="Public reply" on={config.public !== false} onChange={set('public')} accentColor={ACCENT} />
        </>
      )}

      {show('assignTicket') && (
        <div className="grid grid-cols-2 gap-2">
          {text('Assignee ID', 'assigneeId', { placeholder: '123' })}
          {text('Group ID', 'groupId', { optional: true, placeholder: '456' })}
        </div>
      )}

      {show('addTicketTags', 'removeTicketTags', 'addUserTags') &&
        text('Tags (comma-sep)', 'tags', { placeholder: 'vip, escalated' })}

      {show('mergeTickets') && (
        <>
          {text('Source Ticket IDs (comma-sep)', 'sourceIds', { placeholder: '201, 202', hint: 'These merge into the Ticket ID above' })}
          {text('Target Comment', 'targetComment', { placeholder: 'Merged duplicate tickets', multiline: true })}
        </>
      )}

      {show('getUser', 'updateUser', 'deleteUser', 'listUserTickets', 'addUserTags') &&
        text('User ID', 'userId', { placeholder: '{{n1.id}}' })}

      {show('createUser', 'updateUser', 'createOrUpdateUser') && (
        <>
          {text('Name', 'name', { placeholder: '{{n1.name}}' })}
          {text('Email', 'email', { placeholder: '{{n1.email}}' })}
          <div className="grid grid-cols-2 gap-2">
            <ConfigPills label="Role" value={config.role ?? 'end-user'} onChange={set('role')} options={['end-user', 'agent', 'admin']} accentColor={ACCENT} />
            {text('Phone', 'phone', { placeholder: '+15551234567' })}
          </div>
          {text('Organization ID', 'organizationId', { optional: true, placeholder: '789' })}
        </>
      )}

      {show('listUserTickets') && (
        <ConfigPills label="Ticket Role" value={config.ticketRole ?? 'requested'} onChange={set('ticketRole')} options={['requested', 'assigned', 'ccd']} accentColor={ACCENT} />
      )}

      {show('getOrganization', 'updateOrganization', 'deleteOrganization', 'listOrganizationTickets') &&
        text('Organization ID', 'organizationId', { placeholder: '{{n1.id}}' })}

      {show('createOrganization', 'updateOrganization') && (
        <>
          {text('Name', 'name', { placeholder: 'Acme Inc' })}
          {text('Domain Names (comma-sep)', 'domainNames', { placeholder: 'acme.com, acme.io' })}
          {text('Notes', 'notes', { placeholder: 'Enterprise account', multiline: true })}
        </>
      )}

      {show('getGroup', 'updateGroup', 'deleteGroup') && text('Group ID', 'groupId', { placeholder: '{{n1.id}}' })}

      {show('createGroup', 'updateGroup') && (
        <>
          {text('Name', 'name', { placeholder: 'Support Tier 2' })}
          {text('Description', 'description', { placeholder: 'Escalations team', multiline: true })}
        </>
      )}

      {show('createTicketField') && (
        <>
          {text('Field Type', 'fieldType', { placeholder: 'text', hint: 'e.g. text, textarea, checkbox, dropdown' })}
          {text('Title', 'title', { placeholder: 'Order Number' })}
        </>
      )}

      {show('applyMacro') && text('Macro ID', 'macroId', { placeholder: '{{n1.id}}' })}
      {show('executeView', 'countView') && text('View ID', 'viewId', { placeholder: '{{n1.id}}' })}

      {show('search', 'searchTickets', 'searchUsers', 'searchOrganizations') &&
        text('Search Query', 'query', {
          placeholder: op === 'searchOrganizations' ? 'Acme' : 'status:open requester:"{{n1.email}}"',
          hint: op === 'searchTickets' ? 'e.g. status:open priority:high' : 'Zendesk search syntax',
        })}

      {show('getArticle', 'updateArticle', 'deleteArticle') && text('Article ID', 'articleId', { placeholder: '{{n1.id}}' })}
      {show('createArticle') && text('Section ID', 'sectionId', { placeholder: '{{n1.id}}' })}

      {show('createArticle', 'updateArticle') && (
        <>
          {text('Title', 'title', { placeholder: 'How to reset your password' })}
          {text('Body (HTML)', 'body', { placeholder: '<p>Follow these steps...</p>', multiline: true })}
        </>
      )}

      {show('createSection') && text('Category ID', 'categoryId', { placeholder: '{{n1.id}}' })}

      {show('createSection', 'createCategory') && (
        <>
          {text('Name', 'name', { placeholder: 'Getting Started' })}
          {text('Description', 'description', { placeholder: 'Onboarding guides', multiline: true })}
        </>
      )}

      {LIST_OPS.includes(op) && text('Limit', 'limit', { placeholder: '25', def: '25', hint: 'Max 100 per page' })}

      <CredentialPicker
        provider="zendesk"
        value={config.credentialId || ''}
        onChange={set('credentialId')}
        accentColor="blue"
        label="Zendesk API Token"
        placeholder="Select Zendesk credential..."
      />

      <ConfigBanner>
        Credential stored as JSON <span className="text-neutral-300 ml-1">{'{ "email": "agent@x.com", "token": "..." }'}</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
