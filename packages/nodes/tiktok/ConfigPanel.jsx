import { useEffect } from 'react';
import imgTikTok from './logo.svg';
import { Upload, User, ListVideo, Video as VideoIcon, Search } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigInput, ConfigToggleRow, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'publishVideo', label: 'Publish Video', icon: Upload },
  { value: 'getUserInfo',  label: 'Get User Info', icon: User },
  { value: 'listVideos',   label: 'List Videos',   icon: ListVideo },
  { value: 'getVideo',     label: 'Get Video',     icon: VideoIcon },
  { value: 'searchVideos', label: 'Search Videos', icon: Search },
];

const PRIVACY = [
  { value: 'PUBLIC_TO_EVERYONE',    label: 'Public' },
  { value: 'MUTUAL_FOLLOW_FRIENDS', label: 'Friends' },
  { value: 'SELF_ONLY',             label: 'Private' },
];

const USER_FIELDS = [
  { value: 'open_id',           label: 'Open ID' },
  { value: 'display_name',      label: 'Display Name' },
  { value: 'avatar_url',        label: 'Avatar URL' },
  { value: 'profile_deep_link', label: 'Profile Deep Link' },
  { value: 'bio_description',   label: 'Bio Description' },
  { value: 'follower_count',    label: 'Follower Count' },
  { value: 'following_count',   label: 'Following Count' },
  { value: 'likes_count',       label: 'Likes Count' },
  { value: 'video_count',       label: 'Video Count' },
];

const LIST_FIELDS = [
  { value: 'id',                label: 'ID' },
  { value: 'title',             label: 'Title' },
  { value: 'video_description', label: 'Description' },
  { value: 'create_time',       label: 'Create Time' },
  { value: 'view_count',        label: 'View Count' },
  { value: 'like_count',        label: 'Like Count' },
  { value: 'comment_count',     label: 'Comment Count' },
  { value: 'share_count',       label: 'Share Count' },
];

const GET_FIELDS = [
  { value: 'id',                label: 'ID' },
  { value: 'title',             label: 'Title' },
  { value: 'video_description', label: 'Description' },
  { value: 'create_time',       label: 'Create Time' },
  { value: 'view_count',        label: 'View Count' },
  { value: 'like_count',        label: 'Like Count' },
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

export default function TikTokNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const operation = LABEL_TO_OP[config.selectedAction] || config.operation || 'publishVideo';

  useEffect(() => {
    if (operation && operation !== config.operation) updateConfig('operation', operation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation]);

  const multi = (def) => (Array.isArray(config.fields) ? config.fields : def);
  const toggleField = (def) => (val) => {
    const cur = multi(def);
    updateConfig('fields', cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val]);
  };

  const smart = (label, key, opts = {}) => (
    <Field label={label} optional={opts.optional}>
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


      {operation === 'publishVideo' && (
        <>
          {smart('Video URL', 'videoUrl', { placeholder: 'Publicly accessible video URL' })}
          {smart('Title', 'title')}
          {smart('Description', 'description', { optional: true, multiline: true })}
          <ConfigPills
            label="Privacy Level"
            value={config.privacyLevel ?? 'PUBLIC_TO_EVERYONE'}
            onChange={(val) => updateConfig('privacyLevel', val)}
            options={PRIVACY}
            accentColor={ACCENT}
          />
          <ConfigToggleRow
            label="Disable Comments"
            on={config.disableComment ?? false}
            onChange={(v) => updateConfig('disableComment', v)}
            accentColor={ACCENT}
          />
          <ConfigToggleRow
            label="Disable Duet"
            on={config.disableDuet ?? false}
            onChange={(v) => updateConfig('disableDuet', v)}
            accentColor={ACCENT}
          />
          <ConfigToggleRow
            label="Disable Stitch"
            on={config.disableStitch ?? false}
            onChange={(v) => updateConfig('disableStitch', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {operation === 'getUserInfo' && (
        <ConfigPills
          label="Fields"
          options={USER_FIELDS}
          multi={multi(['open_id', 'display_name', 'follower_count'])}
          onChange={toggleField(['open_id', 'display_name', 'follower_count'])}
          accentColor={ACCENT}
        />
      )}

      {operation === 'listVideos' && (
        <>
          <ConfigInput
            label="Max Count"
            type="number"
            value={config.maxCount ?? 20}
            onChange={(val) => updateConfig('maxCount', Number(val))}
          />
          <ConfigPills
            label="Fields"
            options={LIST_FIELDS}
            multi={multi(['id', 'title', 'create_time', 'view_count'])}
            onChange={toggleField(['id', 'title', 'create_time', 'view_count'])}
            accentColor={ACCENT}
          />
        </>
      )}

      {operation === 'getVideo' && (
        <>
          {smart('Video ID', 'videoId')}
          <ConfigPills
            label="Fields"
            options={GET_FIELDS}
            multi={multi(['id', 'title'])}
            onChange={toggleField(['id', 'title'])}
            accentColor={ACCENT}
          />
        </>
      )}

      {operation === 'searchVideos' && (
        <>
          {smart('Search Query', 'query')}
          <ConfigInput
            label="Max Count"
            type="number"
            value={config.maxCount ?? 20}
            onChange={(val) => updateConfig('maxCount', Number(val))}
          />
        </>
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="TikTok Credential"
        placeholder="Select credential…"
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">video, videos, user, shareId</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
