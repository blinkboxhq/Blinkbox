// ─────────────────────────────────────────────────────────────────────────────
// Declarative TRIGGER config schemas — pure JSON. One entry here renders a full
// bordered-mono config panel via components/nodes/MonoSchemaPanel.jsx, no bespoke
// component needed. This is the "n8n-style" layer: describe fields, get a panel.
//
// Schema shape:
//   {
//     title:    string                — header title
//     subtitle: string                — header subtitle
//     icon:     lucide component       — header icon (always rendered white)
//     accent:   "#rrggbb"             — accent for pills / active tabs / dots
//     badge:    { label, tone? }      — optional header status pill (tone: live|sync|info)
//     tabs:     [{ id, label }]       — optional; omit for a flat single-tab panel
//     fields:   [ Field, … ]
//   }
//
// Field shape (every field may carry `tab` to assign it to a tab, and
// `showWhen: { key: value | [values] }` for conditional visibility):
//   { type: "url-display",  label, urlKey?, suffixWhen?: { key, value, suffix } }
//   { type: "text",         key, label, placeholder?, hint? }
//   { type: "password",     key, label, placeholder?, hint? }
//   { type: "textarea",     key, label, placeholder?, hint?, rows? }
//   { type: "select",       key, label, options: [{ value, label }], default? }
//   { type: "pills",        key, label, options, multi?: true }
//   { type: "days",         key, label }                         — Mon…Sun multi-toggle
//   { type: "hour",         key, label }                         — 00:00…23:00 select
//   { type: "switch-row",   key, label, desc, icon? }            — toggle with title/desc
//   { type: "code-preview", label, build: fn(config) }           — read-only mono block
//   { type: "vars",         label, rows: [[token, desc], …] }    — variable reference list
//   { type: "divider",      label? }
//
// Field values flow straight into config[key]; keys MUST match what the backend
// trigger reads.
// ─────────────────────────────────────────────────────────────────────────────

import { Clock, Webhook, MessageSquare, Zap, Lock, ShieldCheck, Bot, Inbox, MailOpen, CheckCheck, Rss, Filter, Sparkles, Activity } from 'lucide-react';

const IMAP_HOSTS = [
  { value: 'imap.gmail.com',        label: 'Gmail',             port: 993 },
  { value: 'outlook.office365.com', label: 'Outlook / Hotmail', port: 993 },
  { value: 'imap.mail.yahoo.com',   label: 'Yahoo Mail',        port: 993 },
  { value: 'imap.mail.me.com',      label: 'iCloud Mail',       port: 993 },
  { value: '',                      label: 'Custom IMAP',       port: 993 },
];

const POLL_INTERVALS = [
  { value: '* * * * *',    label: 'Every minute' },
  { value: '*/2 * * * *',  label: 'Every 2 minutes' },
  { value: '*/5 * * * *',  label: 'Every 5 minutes' },
  { value: '*/15 * * * *', label: 'Every 15 minutes' },
  { value: '*/30 * * * *', label: 'Every 30 minutes' },
];

const DAY_CRON = { Mon: '1', Tue: '2', Wed: '3', Thu: '4', Fri: '5', Sat: '6', Sun: '0' };
const pad = (n) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => ({ value: pad(i), label: `${pad(i)}:00` }));

const INTERVAL_PRESETS = [
  { label: 'Every minute',     value: 'every_minute', cron: '* * * * *' },
  { label: 'Every 5 minutes',  value: 'every_5m',     cron: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: 'every_15m',    cron: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: 'every_30m',    cron: '*/30 * * * *' },
  { label: 'Every hour',       value: 'every_hour',   cron: '0 * * * *' },
  { label: 'Every 6 hours',    value: 'every_6h',     cron: '0 */6 * * *' },
  { label: 'Every 12 hours',   value: 'every_12h',    cron: '0 */12 * * *' },
  { label: 'Once a day',       value: 'daily',        cron: '0 9 * * *' },
  { label: 'Once a week',      value: 'weekly',       cron: '0 9 * * 1' },
  { label: 'Custom (cron)',    value: 'custom',       cron: null },
];

const TIMEZONES = [
  { value: 'UTC',                 label: 'UTC' },
  { value: 'America/New_York',    label: 'New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'America/Chicago',     label: 'Chicago (CST/CDT)' },
  { value: 'Europe/London',       label: 'London (GMT/BST)' },
  { value: 'Europe/Paris',        label: 'Paris (CET/CEST)' },
  { value: 'Asia/Kolkata',        label: 'Mumbai (IST)' },
  { value: 'Asia/Tokyo',          label: 'Tokyo (JST)' },
  { value: 'Asia/Singapore',      label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney',    label: 'Sydney (AEST/AEDT)' },
];

const liveCron = (config) => {
  const preset = config.preset || 'every_hour';
  const dailyHour = config.dailyHour || '09';
  const selectedDays = config.selectedDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  if (preset === 'custom') return config.customCron || '0 * * * *';
  if (preset === 'daily') return `0 ${dailyHour} * * *`;
  if (preset === 'weekly') {
    const days = selectedDays.map((d) => DAY_CRON[d]).join(',');
    return `0 ${dailyHour} * * ${days || '*'}`;
  }
  return (INTERVAL_PRESETS.find((p) => p.value === preset) || INTERVAL_PRESETS[4]).cron;
};

export const TRIGGER_SCHEMAS = {
  cron_trigger: {
    title: 'Schedule',
    subtitle: 'Run this workflow on a timer',
    icon: Clock,
    accent: '#f5b542',
    badge: { label: liveCron, tone: 'code' },
    fields: [
      { type: 'select', key: 'preset', label: 'Run Every', default: 'every_hour',
        options: INTERVAL_PRESETS.map((p) => ({ value: p.value, label: p.label })),
        sideEffects: (val) => { const p = INTERVAL_PRESETS.find((x) => x.value === val); return p?.cron ? { schedule: p.cron } : {}; } },
      { type: 'days', key: 'selectedDays', label: 'On These Days', showWhen: { preset: 'weekly' } },
      { type: 'hour', key: 'dailyHour', label: 'At Time', default: '09', showWhen: { preset: ['daily', 'weekly'] } },
      { type: 'text', key: 'customCron', label: 'Cron Expression', default: '0 * * * *',
        placeholder: '0 9 * * 1-5', hint: '// minute hour day-of-month month day-of-week',
        mirrorTo: 'schedule', showWhen: { preset: 'custom' } },
      { type: 'select', key: 'timezone', label: 'Timezone', default: 'UTC', options: TIMEZONES },
      { type: 'vars', label: 'Output Variables', rows: [
        ['$trigger.triggeredAt', 'ISO timestamp when the schedule fired'],
        ['$trigger.schedule', 'Cron expression (e.g. "0 9 * * *")'],
        ['$trigger.timezone', 'Configured timezone string'],
      ] },
    ],
  },

  webhook: {
    title: 'Webhook',
    subtitle: 'Trigger this workflow with an HTTP call',
    icon: Webhook,
    accent: '#6f97e8',
    badge: { label: 'Sync', tone: 'sync', showWhen: { syncMode: true } },
    tabs: [{ id: 'setup', label: 'Setup' }, { id: 'security', label: 'Security' }],
    fields: [
      { type: 'url-display', tab: 'setup', label: 'Your Webhook URL',
        suffixWhen: { key: 'syncMode', value: true, suffix: '?wait=true' } },
      { type: 'pills', tab: 'setup', key: 'allowedMethods', label: 'Accept Methods', multi: true, default: ['POST'],
        options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({ value: m, label: m })) },
      { type: 'switch-row', tab: 'setup', key: 'syncMode', icon: Zap, label: 'Wait For Response',
        desc: 'Holds the connection open until the workflow finishes, then returns its output.' },
      { type: 'switch-row', tab: 'security', key: 'authEnabled', icon: Lock, label: 'Require Bearer Token',
        desc: 'Callers must pass Authorization: Bearer <secret>.' },
      { type: 'password', tab: 'security', key: 'secret', label: 'Secret Token',
        placeholder: 'Paste a strong secret…', hint: '// requests without it are rejected with 401',
        showWhen: { authEnabled: true } },
      { type: 'switch-row', tab: 'security', key: 'hmacEnabled', icon: ShieldCheck, label: 'HMAC Signature Verification',
        desc: 'Verify the webhook came from a trusted source (GitHub / Stripe style).' },
      { type: 'password', tab: 'security', key: 'hmacSecret', label: 'HMAC Secret',
        placeholder: 'Shared secret from provider…', showWhen: { hmacEnabled: true } },
      { type: 'select', tab: 'security', key: 'hmacAlgorithm', label: 'Algorithm', default: 'sha256',
        options: [{ value: 'sha256', label: 'SHA-256' }, { value: 'sha1', label: 'SHA-1 (legacy)' }, { value: 'sha512', label: 'SHA-512' }],
        showWhen: { hmacEnabled: true } },
      { type: 'text', tab: 'security', key: 'hmacHeader', label: 'Signature Header', default: 'x-hub-signature-256',
        hint: '// requests with invalid or missing signatures are rejected with 401', showWhen: { hmacEnabled: true } },
    ],
  },

  chat_trigger: {
    title: 'Chat Message',
    subtitle: 'Trigger from a chat / conversation message',
    icon: MessageSquare,
    accent: '#e8729f',
    badge: { label: 'Live Chat', tone: 'live' },
    tabs: [{ id: 'setup', label: 'Setup' }, { id: 'prompt', label: 'Prompt' }, { id: 'security', label: 'Security' }],
    fields: [
      { type: 'url-display', tab: 'setup', label: 'Endpoint URL' },
      { type: 'text', tab: 'setup', key: 'sessionIdField', label: 'Session ID Field', default: 'sessionId',
        placeholder: 'sessionId', hint: '// groups messages from one user into a conversation thread' },
      { type: 'code-preview', tab: 'setup', label: 'Expected Payload',
        build: (c) => `{\n  "message": "What's the weather?",\n  "${c.sessionIdField || 'sessionId'}": "user_abc123"\n}` },
      { type: 'textarea', tab: 'prompt', key: 'systemPrompt', label: 'System Prompt', icon: Bot, rows: 6,
        placeholder: "You are a helpful assistant. Answer the user's question clearly and concisely.",
        hint: '// reference as {{ $trigger.systemPrompt }} in any AI node' },
      { type: 'switch-row', tab: 'security', key: 'authEnabled', icon: Lock, label: 'Require Bearer Token',
        desc: 'Only your app can call this trigger.' },
      { type: 'password', tab: 'security', key: 'secret', label: 'Secret Token',
        placeholder: 'Paste a strong secret…', hint: '// requests without it are rejected with 401',
        showWhen: { authEnabled: true } },
    ],
  },
};

TRIGGER_SCHEMAS.imap_trigger = {
  title: 'Email Inbox',
  subtitle: 'Trigger when a new email arrives (IMAP)',
  icon: Inbox,
  accent: '#3fd0e0',
  tabs: [{ id: 'setup', label: 'Setup' }, { id: 'filters', label: 'Filters' }],
  fields: [
    { type: 'select', tab: 'setup', key: 'imapPreset', label: 'Email Provider', default: 'imap.gmail.com',
      options: IMAP_HOSTS.map((h) => ({ value: h.value, label: h.label })),
      sideEffects: (val) => { const h = IMAP_HOSTS.find((x) => x.value === val); return { imapHost: val, imapPort: h?.port || 993 }; } },
    { type: 'text', tab: 'setup', key: 'imapHost', label: 'IMAP Host', placeholder: 'imap.example.com',
      showWhen: { imapPreset: '' } },
    { type: 'text', tab: 'setup', key: 'imapPort', label: 'Port', default: '993', placeholder: '993',
      showWhen: { imapPreset: '' } },
    { type: 'text', tab: 'setup', key: 'imapUser', label: 'Email Address', placeholder: 'you@gmail.com',
      hint: '// store the password / app-password in Credentials, not here' },
    { type: 'select', tab: 'setup', key: 'pollInterval', label: 'Check Every', default: '*/5 * * * *', options: POLL_INTERVALS },
    { type: 'text', tab: 'filters', key: 'mailbox', label: 'Mailbox / Folder', default: 'INBOX', placeholder: 'INBOX',
      hint: '// use INBOX for the main inbox, or a folder name like "Work"' },
    { type: 'switch-row', tab: 'filters', key: 'onlyUnread', icon: MailOpen, label: 'Only Unread Emails', default: true,
      desc: 'Skip emails that have already been read.' },
    { type: 'switch-row', tab: 'filters', key: 'markRead', icon: CheckCheck, label: 'Mark As Read After Processing', default: true,
      desc: 'Prevents re-processing the same email on the next poll.' },
    { type: 'vars', tab: 'filters', label: 'Output Variables', rows: [
      ['$trigger.latestEmail.subject', 'Subject line of the newest email'],
      ['$trigger.latestEmail.from', 'Sender address'],
      ['$trigger.latestEmail.body', 'Plain-text body (first 2000 chars)'],
      ['$trigger.latestEmail.hasAttachments', 'true if the email has attachments'],
      ['$trigger.emails', 'Array of all fetched emails'],
      ['$trigger.count', 'Number of emails this poll'],
    ] },
  ],
};

const RSS_INTERVALS = [
  { value: '*/5 * * * *',  label: 'Every 5 minutes' },
  { value: '*/15 * * * *', label: 'Every 15 minutes' },
  { value: '*/30 * * * *', label: 'Every 30 minutes' },
  { value: '0 * * * *',    label: 'Every hour' },
  { value: '0 */6 * * *',  label: 'Every 6 hours' },
  { value: '0 9 * * *',    label: 'Once a day (9am)' },
];

TRIGGER_SCHEMAS.rss_trigger = {
  title: 'RSS / Atom Feed',
  subtitle: 'Trigger when a feed publishes a new item',
  icon: Rss,
  accent: '#fb923c',
  tabs: [{ id: 'setup', label: 'Setup' }, { id: 'filters', label: 'Filters' }],
  fields: [
    { type: 'text', tab: 'setup', key: 'feedUrl', label: 'Feed URL', placeholder: 'https://example.com/feed.xml',
      hint: '// any public RSS or Atom feed — blog, news site, podcast, YouTube channel' },
    { type: 'select', tab: 'setup', key: 'pollInterval', label: 'Check Every', default: '*/15 * * * *', options: RSS_INTERVALS },
    { type: 'switch-row', tab: 'setup', key: 'onlyNew', icon: Sparkles, label: 'Only New Items', default: true,
      desc: 'Fire once per item. Skip entries already seen on previous checks.' },
    { type: 'text', tab: 'filters', key: 'keyword', label: 'Title / Content Contains', placeholder: 'e.g. funding, release',
      hint: '// only fire when the item mentions this. Comma-separate for any-of. Blank = all items.' },
    { type: 'switch-row', tab: 'filters', key: 'matchAll', icon: Filter, label: 'Match All Keywords', default: false,
      desc: 'On: the item must contain every keyword. Off: any one keyword is enough.', showWhen: { keyword: { $ne: '' } } },
  ],
};

const HTTP_INTERVALS = [
  { value: '30',   label: 'Every 30 seconds' },
  { value: '60',   label: 'Every minute' },
  { value: '300',  label: 'Every 5 minutes' },
  { value: '900',  label: 'Every 15 minutes' },
  { value: '1800', label: 'Every 30 minutes' },
];

TRIGGER_SCHEMAS.http_monitor_trigger = {
  title: 'HTTP Monitor',
  subtitle: 'Watch a URL and fire when it goes down, recovers, or slows',
  icon: Activity,
  accent: '#f87171',
  tabs: [{ id: 'setup', label: 'Setup' }, { id: 'advanced', label: 'Advanced' }],
  fields: [
    { type: 'text', tab: 'setup', key: 'url', label: 'URL to Watch', placeholder: 'https://yoursite.com',
      hint: '// the endpoint to check — a homepage, health route, or API' },
    { type: 'pills', tab: 'setup', key: 'alertOn', label: 'Fire When', default: 'down', options: [
      { value: 'down', label: 'Goes Down' },
      { value: 'up',   label: 'Recovers' },
      { value: 'both', label: 'Either Way' },
      { value: 'slow', label: 'Too Slow' },
    ] },
    { type: 'text', tab: 'setup', key: 'maxResponseMs', label: 'Slow Threshold (ms)', default: '3000', placeholder: '3000',
      hint: '// fire when a response takes longer than this', showWhen: { alertOn: 'slow' } },
    { type: 'select', tab: 'setup', key: 'pollIntervalSeconds', label: 'Check Every', default: '60', options: HTTP_INTERVALS },
    { type: 'text', tab: 'advanced', key: 'expectedKeyword', label: 'Expected Keyword (optional)', placeholder: 'e.g. OK',
      hint: '// the page must contain this text to count as healthy. Blank = any 2xx is healthy.' },
  ],
};

export function getTriggerSchema(backendType) {
  return TRIGGER_SCHEMAS[backendType] || null;
}
