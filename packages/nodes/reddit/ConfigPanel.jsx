import imgReddit from './logo.svg';
import {
  Flame, Clock, TrendingUp, Send, MessageSquare, Search, User, Info, Link2, FileText,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'getHotPosts',     label: 'Get Hot Posts',     icon: Flame },
  { value: 'getNewPosts',     label: 'Get New Posts',     icon: Clock },
  { value: 'getTopPosts',     label: 'Get Top Posts',     icon: TrendingUp },
  { value: 'submitPost',      label: 'Submit Post',       icon: Send },
  { value: 'submitComment',   label: 'Submit Comment',    icon: MessageSquare },
  { value: 'searchPosts',     label: 'Search Posts',      icon: Search },
  { value: 'getUserInfo',     label: 'Get User Info',     icon: User },
  { value: 'getSubredditInfo', label: 'Get Subreddit Info', icon: Info },
];

const TIME_FILTERS = ['hour', 'day', 'week', 'month', 'year', 'all'];
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
  const op = config.operation || 'getHotPosts';

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
      <ConfigHeader logoUrl={imgReddit} title="Reddit" subtitle="Posts, comments, subreddits, search" />

      <ConfigSelect
        label="Operation"
        value={op}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {['getHotPosts', 'getNewPosts', 'getTopPosts', 'submitPost', 'submitComment', 'getSubredditInfo'].includes(op) &&
        text('Subreddit', 'subreddit', { placeholder: 'programming (without r/)' })}

      {op === 'getTopPosts' && (
        <ConfigPills
          label="Time Filter"
          value={config.t || 'day'}
          onChange={(val) => updateConfig('t', val)}
          options={TIME_FILTERS}
          accentColor={ACCENT}
        />
      )}

      {['getHotPosts', 'getNewPosts', 'getTopPosts'].includes(op) && (
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

      {op === 'submitComment' && (
        <>
          {text('Parent ID (post or comment fullname)', 'parentId', { placeholder: 't3_xxxx (post) or t1_xxxx (comment)' })}
          {text('Comment Text (Markdown)', 'text', { icon: MessageSquare, placeholder: '{{ $json.reply }}', multiline: true })}
        </>
      )}

      {op === 'searchPosts' && (
        <>
          {text('Query', 'q', { icon: Search, placeholder: '{{ $json.searchTerm }}' })}
          {text('Subreddit (optional, blank = all)', 'subreddit', { placeholder: 'programming' })}
          {text('Limit', 'limit', { placeholder: '10' })}
        </>
      )}

      {op === 'getUserInfo' && text('Username', 'username', { icon: User, placeholder: '{{ $json.username }}' })}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="orange"
        label="Reddit OAuth (Script App)"
        placeholder="Select Reddit credential..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">id, title, score, url, author, subreddit, created_utc</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
