import { useEffect } from 'react';
import imgLinkedIn from './logo.svg';
import { Send, User, Building2, Users } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigInput, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'sharePost',      label: 'Share Post',      icon: Send },
  { value: 'getProfile',     label: 'Get My Profile',  icon: User },
  { value: 'getCompany',     label: 'Get Company',     icon: Building2 },
  { value: 'getConnections', label: 'Get Connections', icon: Users },
];

const VISIBILITY = [
  { value: 'PUBLIC',      label: 'Public' },
  { value: 'CONNECTIONS', label: 'Connections Only' },
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
      {hint && <p className="text-[9px] text-neutral-600 mt-1.5 font-mono tracking-wide leading-relaxed">{hint}</p>}
    </div>
  );
}

export default function LinkedInNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const operation = LABEL_TO_OP[config.selectedAction] || config.operation || 'sharePost';

  useEffect(() => {
    if (operation && operation !== config.operation) updateConfig('operation', operation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation]);

  const smart = (label, key, opts = {}) => (
    <Field label={label} optional={opts.optional} hint={opts.hint}>
      <SmartVariableInput
        value={config[key] || ''}
        onChange={(val) => updateConfig(key, val)}
        placeholder={opts.placeholder || ''}
        multiline={opts.multiline}
        nodeId={nodeId}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">


      {operation === 'sharePost' && (
        <>
          {smart('Post Text', 'text', { multiline: true })}
          <ConfigPills
            label="Visibility"
            value={config.visibility ?? 'PUBLIC'}
            onChange={(val) => updateConfig('visibility', val)}
            options={VISIBILITY}
            accentColor={ACCENT}
          />
          {smart('Image URL', 'imageUrl', { optional: true, hint: 'URL of image to attach' })}
          {smart('Article URL', 'articleUrl', { optional: true, hint: 'Link to share (article URL)' })}
        </>
      )}

      {operation === 'getCompany' &&
        smart('Company ID', 'companyId', { placeholder: 'LinkedIn company ID or vanity name' })}

      {operation === 'getConnections' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <ConfigInput
              label="Start"
              type="number"
              value={config.start ?? 0}
              onChange={(val) => updateConfig('start', Number(val))}
            />
          </div>
          <div className="flex-1">
            <ConfigInput
              label="Count"
              type="number"
              value={config.count ?? 50}
              onChange={(val) => updateConfig('count', Number(val))}
            />
          </div>
        </div>
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="LinkedIn Credential"
        placeholder="Select credential…"
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">postId, profile, company, connections</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
