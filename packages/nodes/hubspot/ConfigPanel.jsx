import { useEffect } from 'react';
import imgHubspot from '@/assets/hubspot.svg';
import {
  UserPlus, User, UserCog, UserMinus, List, Search,
  Building2, FileText, Pencil, Trash2, LifeBuoy, Ticket,
  Package, Tag, StickyNote, CheckSquare, Link2, GitBranch,
  Users, UserCheck, Settings2, ListPlus, ListMinus, DollarSign,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'createContact',   label: 'Create Contact',   icon: UserPlus },
  { value: 'getContact',      label: 'Get Contact',      icon: User },
  { value: 'updateContact',   label: 'Update Contact',   icon: UserCog },
  { value: 'deleteContact',   label: 'Delete Contact',   icon: UserMinus },
  { value: 'listContacts',    label: 'List Contacts',    icon: List },
  { value: 'searchContacts',  label: 'Search Contacts',  icon: Search },
  { value: 'createCompany',   label: 'Create Company',   icon: Building2 },
  { value: 'getCompany',      label: 'Get Company',      icon: Building2 },
  { value: 'updateCompany',   label: 'Update Company',   icon: Pencil },
  { value: 'deleteCompany',   label: 'Delete Company',   icon: Trash2 },
  { value: 'listCompanies',   label: 'List Companies',   icon: List },
  { value: 'searchCompanies', label: 'Search Companies', icon: Search },
  { value: 'createDeal',      label: 'Create Deal',      icon: DollarSign },
  { value: 'getDeal',         label: 'Get Deal',         icon: FileText },
  { value: 'updateDeal',      label: 'Update Deal',      icon: Pencil },
  { value: 'deleteDeal',      label: 'Delete Deal',      icon: Trash2 },
  { value: 'listDeals',       label: 'List Deals',       icon: List },
  { value: 'searchDeals',     label: 'Search Deals',     icon: Search },
  { value: 'createTicket',    label: 'Create Ticket',    icon: LifeBuoy },
  { value: 'getTicket',       label: 'Get Ticket',       icon: Ticket },
  { value: 'updateTicket',    label: 'Update Ticket',    icon: Pencil },
  { value: 'deleteTicket',    label: 'Delete Ticket',    icon: Trash2 },
  { value: 'listTickets',     label: 'List Tickets',     icon: List },
  { value: 'createProduct',   label: 'Create Product',   icon: Package },
  { value: 'getProduct',      label: 'Get Product',      icon: Package },
  { value: 'listProducts',    label: 'List Products',    icon: List },
  { value: 'createLineItem',  label: 'Create Line Item', icon: Tag },
  { value: 'createNote',      label: 'Create Note',      icon: StickyNote },
  { value: 'createTask',      label: 'Create Task',      icon: CheckSquare },
  { value: 'associateObjects',label: 'Associate',        icon: Link2 },
  { value: 'listAssociations',label: 'List Assoc.',      icon: List },
  { value: 'listPipelines',   label: 'List Pipelines',   icon: GitBranch },
  { value: 'listOwners',      label: 'List Owners',      icon: Users },
  { value: 'getOwner',        label: 'Get Owner',        icon: UserCheck },
  { value: 'listProperties',  label: 'List Props',       icon: Settings2 },
  { value: 'addToList',       label: 'Add to List',      icon: ListPlus },
  { value: 'removeFromList',  label: 'Remove from List', icon: ListMinus },
];

const OBJECT_TYPES = [
  { value: 'contacts', label: 'Contacts' },
  { value: 'companies', label: 'Companies' },
  { value: 'deals', label: 'Deals' },
  { value: 'tickets', label: 'Tickets' },
];
const TASK_STATUS = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'WAITING', label: 'Waiting' },
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

export default function HubspotNode({ config = {}, updateConfig }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const op = LABEL_TO_OP[config.selectedAction] || config.operation || 'createContact';

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

      <CredentialPicker
        provider="hubspot"
        value={config.credentialId || ''}
        onChange={set('credentialId')}
        accentColor="blue"
        label="HubSpot Private App Token"
        placeholder="Connect your HubSpot account"
      />


      {show('getContact', 'updateContact', 'deleteContact') &&
        text('Contact ID', 'contactId', { placeholder: 'Numeric contact ID', hint: show('getContact') ? 'Or use email below' : undefined })}
      {show('createContact', 'updateContact', 'getContact') && text('Email', 'email', { placeholder: 'jane@example.com' })}
      {show('createContact', 'updateContact') && (
        <>
          {text('First Name', 'firstName', { placeholder: 'Jane' })}
          {text('Last Name', 'lastName', { placeholder: 'Doe' })}
          {text('Phone', 'phone', { placeholder: '+1 555 555 5555' })}
          {text('Company', 'company', { placeholder: 'Acme Inc' })}
          {text('Job Title', 'jobTitle', { placeholder: 'VP Sales' })}
        </>
      )}

      {show('getCompany', 'updateCompany', 'deleteCompany') && text('Company ID', 'companyId', { placeholder: 'Numeric company ID' })}
      {show('createCompany', 'updateCompany') && (
        <>
          {text('Company Name', 'companyName', { placeholder: 'Acme Inc' })}
          {text('Domain', 'domain', { placeholder: 'acme.com' })}
          {text('Industry', 'industry', { placeholder: 'Software' })}
          {text('City', 'city', { placeholder: 'San Francisco' })}
          {text('Country', 'country', { placeholder: 'United States' })}
        </>
      )}

      {show('getDeal', 'updateDeal', 'deleteDeal') && text('Deal ID', 'dealId', { placeholder: 'Numeric deal ID' })}
      {show('createDeal', 'updateDeal') && (
        <>
          {text('Deal Name', 'dealName', { placeholder: 'New enterprise deal' })}
          {text('Amount', 'amount', { placeholder: '50000' })}
          {text('Stage', 'stage', { placeholder: 'appointmentscheduled', hint: 'Internal deal stage ID' })}
          {text('Pipeline', 'pipeline', { optional: true, placeholder: 'default' })}
          {text('Close Date', 'closeDate', { optional: true, placeholder: '2026-12-31' })}
        </>
      )}

      {show('getTicket', 'updateTicket', 'deleteTicket') && text('Ticket ID', 'ticketId', { placeholder: 'Numeric ticket ID' })}
      {show('createTicket', 'updateTicket') && (
        <>
          {text('Subject', 'subject', { placeholder: 'Login issue' })}
          {text('Content', 'content', { placeholder: 'Description of the issue', multiline: true })}
          {text('Priority', 'priority', { placeholder: 'HIGH / MEDIUM / LOW' })}
          {text('Stage', 'stage', { optional: true, placeholder: 'Pipeline stage ID' })}
        </>
      )}

      {show('getProduct') && text('Product ID', 'productId', { placeholder: 'Numeric product ID' })}
      {show('createProduct', 'createLineItem') && (
        <>
          {text('Name', 'name', { placeholder: 'Pro Subscription' })}
          {text('Price', 'price', { placeholder: '99.00' })}
        </>
      )}
      {show('createLineItem') && (
        <>
          {text('Quantity', 'quantity', { placeholder: '1', def: '1' })}
          {text('Product ID', 'productId', { optional: true, placeholder: 'Linked product ID' })}
        </>
      )}

      {show('createNote') && text('Note Body', 'body', { placeholder: 'Note content', multiline: true })}
      {show('createTask') && (
        <>
          {text('Subject', 'subject', { placeholder: 'Follow up with prospect' })}
          {text('Body', 'body', { optional: true, placeholder: 'Task details', multiline: true })}
          <ConfigPills label="Status" value={config.status ?? 'NOT_STARTED'} onChange={set('status')} options={TASK_STATUS} accentColor={ACCENT} />
          {text('Owner ID', 'ownerId', { optional: true, placeholder: 'HubSpot owner ID' })}
        </>
      )}
      {show('createNote', 'createTask') && (
        <Field label="Associate to records" optional hint="Provide any record IDs to link this engagement">
          <div className="flex flex-col gap-2">
            <SmartVariableInput value={config.contactId ?? ''} onChange={set('contactId')} placeholder="Contact ID" />
            <SmartVariableInput value={config.dealId ?? ''} onChange={set('dealId')} placeholder="Deal ID" />
            <SmartVariableInput value={config.companyId ?? ''} onChange={set('companyId')} placeholder="Company ID" />
            <SmartVariableInput value={config.ticketId ?? ''} onChange={set('ticketId')} placeholder="Ticket ID" />
          </div>
        </Field>
      )}

      {show('associateObjects', 'listAssociations') && (
        <>
          {text('From Object Type', 'fromType', { placeholder: 'contacts' })}
          {text('From ID', 'fromId', { placeholder: 'Source record ID' })}
          {text('To Object Type', 'toType', { placeholder: 'deals' })}
        </>
      )}
      {show('associateObjects') && text('To ID', 'toId', { placeholder: 'Target record ID' })}

      {show('listPipelines', 'listProperties') && (
        <Field label="Object Type">
          <ConfigPills value={config.objectType ?? 'deals'} onChange={set('objectType')} options={OBJECT_TYPES} accentColor={ACCENT} />
        </Field>
      )}
      {show('getOwner') && text('Owner ID', 'ownerId', { placeholder: 'Numeric owner ID' })}
      {show('listOwners') && text('Filter by Email', 'email', { optional: true, placeholder: 'rep@company.com' })}

      {show('addToList', 'removeFromList') && (
        <>
          {text('List ID', 'listId', { placeholder: 'Numeric list ID' })}
          {text('Contact ID(s)', 'contactId', { placeholder: '123, 456', hint: 'Comma-separated for multiple' })}
        </>
      )}

      {show('searchContacts', 'searchCompanies', 'searchDeals') && (
        <>
          {text('Query', 'query', { optional: true, placeholder: 'Free-text search' })}
          {text('Filter Groups JSON', 'filterGroups', { optional: true, placeholder: '[{"filters":[...]}]', multiline: true, hint: '[{"filters":[{"propertyName":"email","operator":"EQ","value":"x"}]}]' })}
          {text('Sort Property', 'sortProperty', { optional: true, placeholder: 'createdate' })}
        </>
      )}

      {show('createContact', 'updateContact', 'createCompany', 'updateCompany', 'createDeal', 'updateDeal', 'createTicket', 'updateTicket') &&
        text('Extra Properties JSON', 'extraProperties', { optional: true, placeholder: '{"custom_field":"value"}', multiline: true, hint: '{"custom_field":"value"}' })}

      {show('listContacts', 'listCompanies', 'listDeals', 'listTickets', 'listProducts', 'searchContacts', 'searchCompanies', 'searchDeals') &&
        text('Limit', 'limit', { placeholder: '20', def: '20', hint: 'Max 100' })}
      {show('listContacts', 'listCompanies', 'listDeals', 'listTickets', 'listProducts') &&
        text('After Cursor', 'after', { optional: true, placeholder: 'Paging cursor from previous run' })}

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">id, properties, results[ ], paging</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
