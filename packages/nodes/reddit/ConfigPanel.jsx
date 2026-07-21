import { useEffect } from 'react';
import imgReddit from './logo.svg';
import {
  Flame, Send, MessageSquare, Search, User, Info, Link2, FileText,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

export const OPERATIONS = [
  { value: 'listPosts',     label: 'List Posts',     icon: Flame },
  { value: 'submitPost',      label: 'Submit Post',       icon: Send },
  { value: 'reply',   label: 'Submit Comment',    icon: MessageSquare },
  { value: 'search',     label: 'Search Posts',      icon: Search },
  { value: 'getUser',     label: 'Get User Info',     icon: User },
  { value: 'getSubreddit', label: 'Get Subreddit Info', icon: Info },
];

const TIME_FILTERS = ['hour', 'day', 'week', 'month', 'year', 'all'];
const SORTS = [
  { value: 'hot', label: 'Hot' },
  { value: 'new', label: 'New' },
  { value: 'top', label: 'Top' },
  { value: 'rising', label: 'Rising' },
  { value: 'controversial', label: 'Controversial' },
];
const LIMITS = [5, 10, 25, 50];
const POST_KINDS = [
  { value: 'link', label: 'Link Post' },
  { value: 'self', label: 'Text Post' },
];

function Field({ label, icon, children }) {
  return (
    <div className="flex flex-col">
      {label && <ConfigLabel icon={icon}>{label}</ConfigLabel>}
      {children}
    </div>
  );
}

export default function RedditNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const op = LABEL_TO_OP[config.selectedAction] || config.operation || 'listPosts';

  useEffect(() => {
    if (op && op !== config.operation) updateConfig('operation', op);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op]);

  const text = (label, key, opts = {}) => (
    <Field label={label} icon={opts.icon}>
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


      {['listPosts', 'submitPost', 'reply', 'getSubreddit'].includes(op) &&
        text('Subreddit', 'subreddit', { placeholder: 'programming (without r/)' })}

      {op === 'listPosts' && (
        <ConfigPills
          label="Sort"
          value={config.sort || 'hot'}
          onChange={(val) => updateConfig('sort', val)}
          options={SORTS}
          accentColor={ACCENT}
        />
      )}

      {op === 'listPosts' && ['top', 'controversial'].includes(config.sort) && (
        <ConfigPills
          label="Time Filter"
          value={config.time || 'day'}
          onChange={(val) => updateConfig('time', val)}
          options={TIME_FILTERS}
          accentColor={ACCENT}
        />
      )}

      {op === 'listPosts' && (
        <ConfigPills
          label="Limit"
          value={config.limit || 10}
          onChange={(val) => updateConfig('limit', val)}
          options={LIMITS.map((l) => ({ value: l, label: String(l) }))}
          accentColor={ACCENT}
        />
      )}

      {op === 'submitPost' && (
        <>
          <ConfigPills
            label="Post Type"
            value={config.kind || 'link'}
            onChange={(val) => updateConfig('kind', val)}
            options={POST_KINDS}
            accentColor={ACCENT}
          />
          {text('Title', 'title', { icon: FileText, placeholder: '{{ $json.title }}' })}
          {config.kind === 'self'
            ? text('Text Content', 'text', { icon: FileText, placeholder: '{{ $json.body }}', multiline: true })
            : text('URL', 'url', { icon: Link2, placeholder: '{{ $json.url }}' })}
        </>
      )}

      {op === 'reply' && (
        <>
          {text('Parent ID (post or comment fullname)', 'parent', { placeholder: 't3_xxxx (post) or t1_xxxx (comment)' })}
          {text('Comment Text (Markdown)', 'text', { icon: MessageSquare, placeholder: '{{ $json.reply }}', multiline: true })}
        </>
      )}

      {op === 'search' && (
        <>
          {text('Query', 'query', { icon: Search, placeholder: '{{ $json.searchTerm }}' })}
          {text('Subreddit (optional, blank = all)', 'subreddit', { placeholder: 'programming' })}
          {text('Limit', 'limit', { placeholder: '10' })}
        </>
      )}

      {op === 'getUser' && text('Username', 'username', { icon: User, placeholder: '{{ $json.username }}' })}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Reddit OAuth (Script App)"
        placeholder="Select Reddit credential..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">id, title, score, url, author, subreddit, created_utc</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
