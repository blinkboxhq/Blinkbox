import imgYouTube from './logo.png';
import { Video, Type, AlignLeft, Tags, Image, ListVideo, BellRing } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigToggleRow, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const CATEGORIES = [
  { value: '1',  label: 'Film & Animation' },
  { value: '2',  label: 'Autos & Vehicles' },
  { value: '10', label: 'Music' },
  { value: '15', label: 'Pets & Animals' },
  { value: '17', label: 'Sports' },
  { value: '19', label: 'Travel & Events' },
  { value: '20', label: 'Gaming' },
  { value: '22', label: 'People & Blogs' },
  { value: '23', label: 'Comedy' },
  { value: '24', label: 'Entertainment' },
  { value: '25', label: 'News & Politics' },
  { value: '26', label: 'How-to & Style' },
  { value: '27', label: 'Education' },
  { value: '28', label: 'Science & Technology' },
];

const PRIVACY = [
  { value: 'public', label: 'Public' },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'private', label: 'Private' },
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

export default function YouTubeUploadNode({ config = {}, updateConfig, nodeId }) {
  const text = (label, key, opts = {}) => (
    <Field label={label} icon={opts.icon} optional={opts.optional}>
      <SmartVariableInput
        value={config[key] ?? ''}
        onChange={(val) => updateConfig(key, val)}
        placeholder={opts.placeholder || ''}
        multiline={opts.multiline}
        nodeId={nodeId}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">
      {text('Video URL or Base64', 'videoUrl', { icon: Video, placeholder: '{{ $json.videoUrl }}' })}
      {text('Title', 'title', { icon: Type, placeholder: '{{ $json.title }}' })}
      {text('Description', 'description', { icon: AlignLeft, placeholder: '{{ $json.description }}', multiline: true })}
      {text('Tags (comma-separated)', 'tags', { icon: Tags, placeholder: 'vlog, tech, tutorial, {{ $json.tags }}' })}

      <div className="flex gap-3">
        <div className="flex-1">
          <ConfigPills
            label="Privacy"
            value={config.privacy ?? 'public'}
            onChange={(val) => updateConfig('privacy', val)}
            options={PRIVACY}
            accentColor={ACCENT}
          />
        </div>
      </div>

      <ConfigSelect
        label="Category"
        value={config.category ?? '22'}
        onChange={(val) => updateConfig('category', val)}
        options={CATEGORIES}
        accentColor={ACCENT}
      />

      {text('Custom Thumbnail URL', 'thumbnail', { icon: Image, optional: true, placeholder: '{{ $json.thumbnailUrl }}' })}
      {text('Playlist ID', 'playlist', { icon: ListVideo, optional: true, placeholder: 'PLxxxxxxxxxxxxxxxx' })}

      <ConfigToggleRow
        label="Notify Subscribers"
        desc="Send upload notification to subscribers"
        icon={BellRing}
        on={config.notifySubscribers ?? true}
        onChange={(v) => updateConfig('notifySubscribers', v)}
        accentColor={ACCENT}
      />

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Google OAuth"
        placeholder="Select Google OAuth..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">videoId, url, title, privacy, uploadedAt</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
