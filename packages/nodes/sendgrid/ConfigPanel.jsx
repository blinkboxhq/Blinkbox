import { Send, Layout, Users, UserPlus, Search, UserSearch, UserX, List, ListPlus, ListX, Files, FileSearch, ShieldCheck, BarChart3, Ban } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';

function SendGridIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M0 8h8V0H0v8zm1-7h6v6H1V1zM8 0v8h8V0H8zm7 7H9V1h6v6zM0 24h8v-8H0v8zm1-7h6v6H1v-6zm15-9h-6v6h-1V8h-1v6H8v1h6v-1h1v6h1v-6h6v-1h-6V8zm-6 7H9v-6h6v6zm.97 2.03H16v6h-6v-1h5v-5zM16 16h1v7h-7v-1h6v-6zM8 16H0v8h8v-8zm-1 7H1v-6h6v6z" />
    </svg>
  );
}

const GROUPS = [
  { name: 'Email', ops: [
    { value: 'sendEmail',    label: 'Send Email',   icon: Send },
    { value: 'sendTemplate', label: 'Use Template', icon: Layout },
    { value: 'sendBulk',     label: 'Bulk Send',    icon: Users },
  ]},
  { name: 'Contacts', ops: [
    { value: 'addContact',    label: 'Add Contact',     icon: UserPlus },
    { value: 'getContact',    label: 'Get Contact',     icon: UserSearch },
    { value: 'searchContacts',label: 'Search Contacts', icon: Search },
    { value: 'deleteContact', label: 'Delete Contact',  icon: UserX },
  ]},
  { name: 'Lists', ops: [
    { value: 'listLists',   label: 'List Lists',  icon: List },
    { value: 'createList',  label: 'Create List', icon: ListPlus },
    { value: 'deleteList',  label: 'Delete List', icon: ListX },
  ]},
  { name: 'Templates & Validation', ops: [
    { value: 'listTemplates', label: 'List Templates', icon: Files },
    { value: 'getTemplate',   label: 'Get Template',   icon: FileSearch },
    { value: 'validateEmail', label: 'Validate Email', icon: ShieldCheck },
  ]},
  { name: 'Stats & Suppressions', ops: [
    { value: 'getStats',          label: 'Get Stats',          icon: BarChart3 },
    { value: 'listSuppressions',  label: 'List Suppressions',  icon: Ban },
    { value: 'deleteSuppression', label: 'Remove Suppression', icon: UserX },
  ]},
];

const lbl = 'text-[10px] font-bold text-zinc-500 uppercase tracking-widest';
const inputCls = 'w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#1A82E2]/40 transition-colors';

export default function SendGridNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'sendEmail';
  const isEmail = ['sendEmail', 'sendTemplate', 'sendBulk'].includes(operation);
  const Field = ({ label, hint, k, placeholder, multiline }) => (
    <div className="flex flex-col gap-2">
      <label className={lbl}>{label}{hint && <span className="text-zinc-700"> {hint}</span>}</label>
      <SmartVariableInput value={config[k] || ''} onChange={(val) => updateConfig(k, val)} placeholder={placeholder} multiline={multiline} nodeId={nodeId} />
    </div>
  );

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-[#1A82E2]/5 border border-[#1A82E2]/20 rounded-xl">
        <div className="p-2 bg-[#1A82E2]/10 rounded-lg text-[#1A82E2] shrink-0">
          <SendGridIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#1A82E2]">SendGrid</span>
          <span className="text-[10px] text-zinc-500">Transactional email & marketing</span>
        </div>
      </div>

      {/* Operations */}
      <div className="flex flex-col gap-3">
        {GROUPS.map((group) => (
          <div key={group.name} className="flex flex-col gap-2">
            <label className={lbl}>{group.name}</label>
            <div className="grid grid-cols-2 gap-2">
              {group.ops.map((op) => {
                const Icon = op.icon;
                return (
                  <button key={op.value} onClick={() => updateConfig('operation', op.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                      operation === op.value
                        ? 'bg-[#1A82E2]/10 border-[#1A82E2]/40 text-[#1A82E2]'
                        : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                    }`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" /> {op.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Shared email fields */}
      {isEmail && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {operation === 'sendBulk' ? 'Recipients (JSON array)' : 'To'}
            </label>
            {operation === 'sendBulk' ? (
              <SmartVariableInput
                value={typeof config.recipients === 'string' ? config.recipients : (config.recipients ? JSON.stringify(config.recipients) : '')}
                onChange={(val) => { try { updateConfig('recipients', JSON.parse(val)); } catch { updateConfig('recipients', val); }}}
                placeholder='[{"email":"a@b.com","name":"Alice"},{"email":"c@d.com"}]'
                multiline
              />
            ) : (
              <SmartVariableInput value={config.to || ''} onChange={(val) => updateConfig('to', val)} placeholder="{{trigger.data.email}}" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">From</label>
            <SmartVariableInput value={config.from || ''} onChange={(val) => updateConfig('from', val)} placeholder="Your Name <noreply@yourapp.com>" />
          </div>
          {operation !== 'sendTemplate' && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Subject</label>
              <SmartVariableInput value={config.subject || ''} onChange={(val) => updateConfig('subject', val)} placeholder="Welcome to {{trigger.data.company}}!" />
            </div>
          )}
        </>
      )}

      {/* sendEmail body */}
      {operation === 'sendEmail' && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Body</label>
          <SmartVariableInput value={config.body || ''} onChange={(val) => updateConfig('body', val)} placeholder="Hello {{trigger.data.name}}, ..." multiline />
        </div>
      )}

      {/* sendTemplate */}
      {operation === 'sendTemplate' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Template ID</label>
            <input value={config.templateId || ''} onChange={(e) => updateConfig('templateId', e.target.value)} placeholder="d-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#1A82E2]/40 transition-colors" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Dynamic Data (JSON)</label>
            <SmartVariableInput
              value={typeof config.dynamicData === 'string' ? config.dynamicData : (config.dynamicData ? JSON.stringify(config.dynamicData, null, 2) : '')}
              onChange={(val) => { try { updateConfig('dynamicData', JSON.parse(val)); } catch { updateConfig('dynamicData', val); }}}
              placeholder='{"name": "{{trigger.data.name}}", "plan": "Pro"}'
              multiline
            />
          </div>
        </>
      )}

      {/* addContact */}
      {operation === 'addContact' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Email</label>
            <SmartVariableInput value={config.email || ''} onChange={(val) => updateConfig('email', val)} placeholder="{{trigger.data.email}}" />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">First Name</label>
              <SmartVariableInput value={config.firstName || ''} onChange={(val) => updateConfig('firstName', val)} placeholder="{{trigger.data.firstName}}" />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Last Name</label>
              <SmartVariableInput value={config.lastName || ''} onChange={(val) => updateConfig('lastName', val)} placeholder="{{trigger.data.lastName}}" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">List ID <span className="text-zinc-700">(optional)</span></label>
            <input value={config.listIds || ''} onChange={(e) => updateConfig('listIds', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#1A82E2]/40 transition-colors" />
          </div>
        </>
      )}

      {/* getContact */}
      {operation === 'getContact' && (
        <>
          <Field label="Contact ID" hint="(or use email below)" k="contactId" placeholder="xxxxxxxx-xxxx-..." />
          <Field label="Email" hint="(if no contact ID)" k="email" placeholder="{{trigger.data.email}}" />
        </>
      )}

      {/* searchContacts */}
      {operation === 'searchContacts' && (
        <div className="flex flex-col gap-2">
          <label className={lbl}>SGQL Query</label>
          <SmartVariableInput value={config.query || ''} onChange={(val) => updateConfig('query', val)} placeholder="email LIKE '%@example.com'" multiline nodeId={nodeId} />
          <p className="text-[10px] text-zinc-600">SendGrid Query Language — e.g. email LIKE '%@acme.com' AND last_name = 'Doe'</p>
        </div>
      )}

      {/* deleteContact */}
      {operation === 'deleteContact' && (
        <Field label="Contact ID" k="contactId" placeholder="xxxxxxxx-xxxx-..." />
      )}

      {/* createList */}
      {operation === 'createList' && (
        <Field label="List Name" k="listName" placeholder="Newsletter Subscribers" />
      )}

      {/* deleteList */}
      {operation === 'deleteList' && (
        <Field label="List ID" k="listId" placeholder="xxxxxxxx-xxxx-..." />
      )}

      {/* getTemplate */}
      {operation === 'getTemplate' && (
        <div className="flex flex-col gap-2">
          <label className={lbl}>Template ID</label>
          <input value={config.templateId || ''} onChange={(e) => updateConfig('templateId', e.target.value)} placeholder="d-XXXXXXXX..." className={`${inputCls} font-mono`} />
        </div>
      )}

      {/* validateEmail */}
      {operation === 'validateEmail' && (
        <Field label="Email" k="email" placeholder="{{trigger.data.email}}" />
      )}

      {/* getStats */}
      {operation === 'getStats' && (
        <>
          <div className="flex gap-3">
            <div className="flex flex-col gap-2 flex-1">
              <label className={lbl}>Start Date</label>
              <input type="date" value={config.startDate || ''} onChange={(e) => updateConfig('startDate', e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <label className={lbl}>End Date <span className="text-zinc-700">(optional)</span></label>
              <input type="date" value={config.endDate || ''} onChange={(e) => updateConfig('endDate', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className={lbl}>Aggregate By</label>
            <div className="grid grid-cols-3 gap-2">
              {['day', 'week', 'month'].map((g) => (
                <button key={g} onClick={() => updateConfig('aggregatedBy', g)}
                  className={`p-2 rounded-lg border text-xs font-bold capitalize transition-all ${
                    (config.aggregatedBy || 'day') === g ? 'bg-[#1A82E2]/10 border-[#1A82E2]/40 text-[#1A82E2]' : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                  }`}>{g}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* listSuppressions / deleteSuppression */}
      {(operation === 'listSuppressions' || operation === 'deleteSuppression') && (
        <div className="flex flex-col gap-2">
          <label className={lbl}>Suppression Type</label>
          <div className="grid grid-cols-2 gap-2">
            {['bounces', 'blocks', 'spam_reports', 'invalid_emails', 'unsubscribes'].map((t) => (
              <button key={t} onClick={() => updateConfig('suppressionType', t)}
                className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                  (config.suppressionType || 'bounces') === t ? 'bg-[#1A82E2]/10 border-[#1A82E2]/40 text-[#1A82E2]' : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                }`}>{t.replace('_', ' ')}</button>
            ))}
          </div>
        </div>
      )}
      {operation === 'deleteSuppression' && (
        <Field label="Email" k="email" placeholder="{{trigger.data.email}}" />
      )}

      {(operation === 'listLists' || operation === 'listTemplates') && (
        <div className="flex flex-col gap-2">
          <label className={lbl}>Max Results</label>
          <input type="number" min={1} max={1000} value={config.maxResults || 50} onChange={(e) => updateConfig('maxResults', Number(e.target.value))} className={inputCls} />
        </div>
      )}

      {/* Credential */}
      <CredentialPicker value={config.credentialId || ''} onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue" label="SendGrid API Key" placeholder="Select SendGrid credential..." />
    </div>
  );
}
