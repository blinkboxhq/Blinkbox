import { useEffect } from 'react';
import imgInstagram from './logo.svg';
import { User, Images, Image as ImageIcon, Send, MessageSquare } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigInput, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'getUserInfo',  label: 'Get User Info',  icon: User },
  { value: 'getUserMedia', label: 'Get User Media', icon: Images },
  { value: 'getMedia',     label: 'Get Media',      icon: ImageIcon },
  { value: 'createPost',   label: 'Create Post',    icon: Send },
  { value: 'getComments',  label: 'Get Comments',   icon: MessageSquare },
];

const USER_INFO_FIELDS = [
  { value: 'id',                  label: 'ID' },
  { value: 'username',            label: 'Username' },
  { value: 'name',                label: 'Name' },
  { value: 'biography',           label: 'Biography' },
  { value: 'followers_count',     label: 'Followers Count' },
  { value: 'following_count',     label: 'Following Count' },
  { value: 'media_count',         label: 'Media Count' },
  { value: 'profile_picture_url', label: 'Profile Picture URL' },
  { value: 'website',             label: 'Website' },
];

const MEDIA_FIELDS = [
  { value: 'id',             label: 'ID' },
  { value: 'caption',        label: 'Caption' },
  { value: 'media_type',     label: 'Media Type' },
  { value: 'media_url',      label: 'Media URL' },
  { value: 'timestamp',      label: 'Timestamp' },
  { value: 'like_count',     label: 'Like Count' },
  { value: 'comments_count', label: 'Comments Count' },
];

function Field({ label, icon, optional, children }) {
  return (
    <div className="flex flex-col">
      {label && (
        <ConfigLabel icon={icon}>
          {label}{optional && <span className="text-neutral-700 normal-case tracking-normal"> (optional)</span>}
        </ConfigLabel>
      )}
      {children}
    </div>
  );
}

export default function InstagramNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const operation = LABEL_TO_OP[config.selectedAction] || config.operation || 'getUserInfo';

  useEffect(() => {
    if (operation && operation !== config.operation) updateConfig('operation', operation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation]);

  const multi = (def) => (Array.isArray(config.fields) ? config.fields : def);
  const toggleField = (def) => (val) => {
    const cur = multi(def);
    updateConfig('fields', cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val]);
  };

  return (
    <ConfigSection className="gap-5">

      <ConfigBanner tone="warn">
        Requires Instagram Business or Creator account connected via Facebook
      </ConfigBanner>


      {operation === 'getUserInfo' && (
        <ConfigPills
          label="Fields"
          options={USER_INFO_FIELDS}
          multi={multi(['id', 'username', 'followers_count'])}
          onChange={toggleField(['id', 'username', 'followers_count'])}
          accentColor={ACCENT}
        />
      )}

      {operation === 'getUserMedia' && (
        <>
          <ConfigPills
            label="Fields"
            options={MEDIA_FIELDS}
            multi={multi(['id', 'caption', 'media_url', 'timestamp'])}
            onChange={toggleField(['id', 'caption', 'media_url', 'timestamp'])}
            accentColor={ACCENT}
          />
          <ConfigInput
            label="Limit"
            type="number"
            value={config.limit ?? 12}
            onChange={(val) => updateConfig('limit', Number(val))}
          />
        </>
      )}

      {(operation === 'getMedia' || operation === 'getComments') && (
        <Field label="Media ID">
          <SmartVariableInput
            value={config.mediaId || ''}
            onChange={(val) => updateConfig('mediaId', val)}
            nodeId={nodeId}
          />
        </Field>
      )}

      {operation === 'getComments' && (
        <ConfigInput
          label="Limit"
          type="number"
          value={config.limit ?? 20}
          onChange={(val) => updateConfig('limit', Number(val))}
        />
      )}

      {operation === 'createPost' && (
        <>
          <Field label="Image URL">
            <SmartVariableInput
              value={config.imageUrl || ''}
              onChange={(val) => updateConfig('imageUrl', val)}
              placeholder="Publicly accessible image URL"
              nodeId={nodeId}
            />
          </Field>
          <Field label="Caption" optional>
            <SmartVariableInput
              value={config.caption || ''}
              onChange={(val) => updateConfig('caption', val)}
              multiline
              nodeId={nodeId}
            />
          </Field>
        </>
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Instagram Credential"
        placeholder="Select credential…"
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">user, media, mediaId, post, comments</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
