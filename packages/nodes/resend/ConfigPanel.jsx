import { useEffect } from 'react';
import imgResend from './logo.svg';
import { Send, FileSearch, List, XCircle } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigInput,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

export const OPERATIONS = [
  { value: 'sendEmail',   label: 'Send Email',   icon: Send },
  { value: 'getEmail',    label: 'Get Email',    icon: FileSearch },
  { value: 'cancelEmail', label: 'Cancel Email', icon: XCircle },
];

function Field({ label, optional, children }) {
  return (
    <div className="flex flex-col">
      {label && (
        <ConfigLabel>
          {label}{optional && <span className="text-neutral-700 normal-case tracking-normal"> (optional)</span>}
        </ConfigLabel>
      )}
      {children}
    </div>
  );
}

export default function ResendNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const operation = LABEL_TO_OP[config.selectedAction] || config.operation || 'sendEmail';

  useEffect(() => {
    if (operation && operation !== config.operation) updateConfig('operation', operation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation]);
  const currentOp = OPERATIONS.find((o) => o.value === operation);

  const field = (label, k, opts = {}) => (
    <Field label={label} optional={opts.optional}>
      <SmartVariableInput value={config[k] || ''} onChange={(val) => updateConfig(k, val)} placeholder={opts.placeholder} multiline={opts.multiline} nodeId={nodeId} />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="API Key"
        placeholder="Select Resend credential..."
      />


      {operation === 'sendEmail' && (
        <>
          {field('From', 'from', { placeholder: 'Team <team@yourdomain.com>' })}
          {field('To', 'to')}
          {field('Subject', 'subject')}
          {field('HTML Body', 'html', { optional: true, multiline: true })}
          {field('Plain Text Body', 'text', { optional: true, multiline: true })}
          {field('Reply-To', 'replyTo', { optional: true })}
          {field('CC', 'cc', { optional: true })}
        </>
      )}

      {(operation === 'getEmail' || operation === 'cancelEmail') && field('Email ID', 'emailId')}

      {operation === 'listEmails' && (
        <ConfigInput label="Limit" type="number" value={config.limit ?? 10} onChange={(v) => updateConfig('limit', Number(v))} />
      )}
    </ConfigSection>
  );
}
