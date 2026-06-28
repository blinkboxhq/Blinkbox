import {
  Plus, Pencil, Trash2, Search, GitBranch, GitMerge, GitPullRequest, CircleDot,
  MessageSquare, Star, GitFork, Rocket,
  DollarSign, RefreshCw, Repeat, XCircle, FileText, AlertTriangle, ShoppingCart,
} from 'lucide-react';

// The "what type of trigger" layer. Keyed by trigger-picker id (github, database,
// stripe). Each subject expands into a list of REAL events; picking one writes
// { event } + the event's field defaults into node config, and MonoSchemaPanel
// renders that event's `fields`. Subjects with no entry here drop directly.
//
// Event shape:
//   { id, label, description, icon, event, accent?, fields: [Field] }
// `event` is the backend discriminator (config.event) the trigger handler branches on.
// `fields` use the same vocabulary as triggerSchemas.js (text/select/switch-row/...).

const PG_PROVIDERS = [
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'mongodb', label: 'MongoDB' },
];

const POLL_INTERVALS = [
  { value: '* * * * *', label: 'Every minute' },
  { value: '*/5 * * * *', label: 'Every 5 minutes' },
  { value: '*/15 * * * *', label: 'Every 15 minutes' },
  { value: '*/30 * * * *', label: 'Every 30 minutes' },
  { value: '0 * * * *', label: 'Every hour' },
];

const dbConnFields = [
  { type: 'select', key: 'dbType', label: 'Database', default: 'postgresql', options: PG_PROVIDERS },
  { type: 'text', key: 'table', label: 'Table / Collection', placeholder: 'users',
    hint: '// the table this trigger watches' },
  { type: 'text', key: 'credentialId', label: 'Connection Credential', placeholder: 'select a saved DB credential',
    hint: '// store the connection string in Credentials, never inline' },
  { type: 'select', key: 'pollInterval', label: 'Check Every', default: '* * * * *', options: POLL_INTERVALS },
];

const dbVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.table', 'the table that changed'],
    ['$trigger.latestRow', 'the row that fired the event'],
    ['$trigger.rows', 'all matching rows this poll'],
    ['$trigger.count', 'how many rows matched'],
    ...extra,
  ],
});

const stripeVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.event', 'the Stripe event type'],
    ['$trigger.id', 'the object id'],
    ['$trigger.amountDecimal', 'amount in major units (e.g. 19.99)'],
    ['$trigger.currency', 'ISO currency code'],
    ['$trigger.customer', 'Stripe customer id'],
    ...extra,
  ],
});

const githubRepoField = {
  type: 'text', key: 'repo', label: 'Repository', placeholder: 'owner/repo',
  hint: '// the repo whose events fire this workflow',
};
const githubSecretField = {
  type: 'password', key: 'webhookSecret', label: 'Webhook Secret',
  placeholder: 'optional — verifies GitHub signatures',
  hint: '// set this and the matching secret in GitHub → Webhooks',
};
const githubVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.event', 'the GitHub event name'],
    ['$trigger.repoName', 'owner/repo'],
    ['$trigger.sender', 'who triggered it'],
    ...extra,
  ],
});

export const TRIGGER_EVENTS = {
  // ── DATABASE ────────────────────────────────────────────────
  database: {
    title: 'Database',
    subtitle: 'Trigger on changes to your database',
    events: [
      {
        id: 'row_inserted', label: 'Row Inserted', description: 'A new row is added to a table',
        icon: Plus, event: 'insert', accent: '#34d399',
        fields: [...dbConnFields, dbVars()],
      },
      {
        id: 'row_updated', label: 'Row Updated', description: 'An existing row changes',
        icon: Pencil, event: 'update', accent: '#34d399',
        fields: [
          ...dbConnFields,
          { type: 'text', key: 'watchColumn', label: 'Watch Column (optional)', placeholder: 'status',
            hint: '// fire only when this column changes; blank = any change' },
          dbVars(),
        ],
      },
      {
        id: 'row_deleted', label: 'Row Deleted', description: 'A row is removed from a table',
        icon: Trash2, event: 'delete', accent: '#34d399',
        fields: [...dbConnFields, dbVars()],
      },
      {
        id: 'row_matching', label: 'Row Matching Query', description: 'A row appears that matches your filter',
        icon: Search, event: 'query', accent: '#34d399',
        fields: [
          ...dbConnFields,
          { type: 'textarea', key: 'query', label: 'SQL / Filter', rows: 3,
            placeholder: 'SELECT * FROM users WHERE status = $1',
            hint: '// rows returned by this query fire the trigger' },
          dbVars(),
        ],
      },
    ],
  },

  // ── GITHUB ──────────────────────────────────────────────────
  github: {
    title: 'GitHub',
    subtitle: 'Trigger on repository activity',
    events: [
      {
        id: 'push', label: 'Push', description: 'Commits are pushed to a branch',
        icon: GitBranch, event: 'push', accent: '#d4d4d8',
        fields: [
          githubRepoField,
          { type: 'text', key: 'branch', label: 'Branch (optional)', placeholder: 'main',
            hint: '// fire only on this branch; blank = any branch' },
          githubSecretField,
          githubVars([['$trigger.branch', 'branch pushed to'], ['$trigger.commitMessage', 'latest commit message']]),
        ],
      },
      {
        id: 'pr_opened', label: 'Pull Request Opened', description: 'A new pull request is opened',
        icon: GitPullRequest, event: 'pull_request', accent: '#d4d4d8',
        fields: [
          githubRepoField, githubSecretField,
          githubVars([['$trigger.prNumber', 'PR number'], ['$trigger.prTitle', 'PR title']]),
        ],
      },
      {
        id: 'pr_merged', label: 'Pull Request Merged', description: 'A pull request is merged',
        icon: GitMerge, event: 'pull_request', accent: '#d4d4d8',
        fields: [
          githubRepoField, githubSecretField,
          githubVars([['$trigger.prNumber', 'PR number'], ['$trigger.baseBranch', 'merged into']]),
        ],
      },
      {
        id: 'issue_opened', label: 'Issue Opened', description: 'A new issue is created',
        icon: CircleDot, event: 'issues', accent: '#d4d4d8',
        fields: [
          githubRepoField, githubSecretField,
          githubVars([['$trigger.issueNumber', 'issue number'], ['$trigger.issueTitle', 'issue title']]),
        ],
      },
      {
        id: 'issue_comment', label: 'Issue Commented', description: 'Someone comments on an issue',
        icon: MessageSquare, event: 'issue_comment', accent: '#d4d4d8',
        fields: [
          githubRepoField, githubSecretField,
          githubVars([['$trigger.issueNumber', 'issue number'], ['$trigger.comment', 'the comment body']]),
        ],
      },
      {
        id: 'star', label: 'Repo Starred', description: 'Someone stars the repository',
        icon: Star, event: 'star', accent: '#d4d4d8',
        fields: [githubRepoField, githubSecretField, githubVars()],
      },
      {
        id: 'fork', label: 'Repo Forked', description: 'Someone forks the repository',
        icon: GitFork, event: 'fork', accent: '#d4d4d8',
        fields: [githubRepoField, githubSecretField, githubVars()],
      },
      {
        id: 'release', label: 'Release Published', description: 'A new release is published',
        icon: Rocket, event: 'release', accent: '#d4d4d8',
        fields: [
          githubRepoField, githubSecretField,
          githubVars([['$trigger.tagName', 'release tag'], ['$trigger.releaseName', 'release title']]),
        ],
      },
    ],
  },

  // ── STRIPE ──────────────────────────────────────────────────
  stripe: {
    title: 'Stripe',
    subtitle: 'Trigger on payment & billing events',
    events: [
      {
        id: 'payment_succeeded', label: 'Payment Succeeded', description: 'A payment completes successfully',
        icon: DollarSign, event: 'payment_intent.succeeded', accent: '#818cf8',
        fields: [stripeSecret, stripeVars([['$trigger.email', 'customer email']])],
      },
      {
        id: 'payment_failed', label: 'Payment Failed', description: 'A payment attempt fails',
        icon: AlertTriangle, event: 'payment_intent.payment_failed', accent: '#818cf8',
        fields: [stripeSecret, stripeVars([['$trigger.status', 'failure status']])],
      },
      {
        id: 'refund', label: 'Refund Created', description: 'A charge is refunded',
        icon: RefreshCw, event: 'charge.refunded', accent: '#818cf8',
        fields: [stripeSecret, stripeVars()],
      },
      {
        id: 'sub_created', label: 'Subscription Created', description: 'A customer starts a subscription',
        icon: Repeat, event: 'customer.subscription.created', accent: '#818cf8',
        fields: [stripeSecret, stripeVars([['$trigger.subscriptionId', 'subscription id']])],
      },
      {
        id: 'sub_canceled', label: 'Subscription Canceled', description: 'A subscription is canceled',
        icon: XCircle, event: 'customer.subscription.deleted', accent: '#818cf8',
        fields: [stripeSecret, stripeVars([['$trigger.subscriptionId', 'subscription id']])],
      },
      {
        id: 'invoice_paid', label: 'Invoice Paid', description: 'An invoice is paid',
        icon: FileText, event: 'invoice.paid', accent: '#818cf8',
        fields: [stripeSecret, stripeVars([['$trigger.invoiceId', 'invoice id']])],
      },
      {
        id: 'invoice_failed', label: 'Invoice Payment Failed', description: 'An invoice payment fails',
        icon: AlertTriangle, event: 'invoice.payment_failed', accent: '#818cf8',
        fields: [stripeSecret, stripeVars([['$trigger.invoiceId', 'invoice id']])],
      },
      {
        id: 'checkout_completed', label: 'Checkout Completed', description: 'A Checkout session completes',
        icon: ShoppingCart, event: 'checkout.session.completed', accent: '#818cf8',
        fields: [stripeSecret, stripeVars([['$trigger.email', 'customer email']])],
      },
    ],
  },
};

function stripeSecretField() {
  return {
    type: 'password', key: 'webhookSecret', label: 'Webhook Signing Secret',
    placeholder: 'whsec_…',
    hint: '// from Stripe → Developers → Webhooks; verifies the event is genuine',
  };
}
const stripeSecret = stripeSecretField();

export function getTriggerEvents(triggerId) {
  return TRIGGER_EVENTS[triggerId] || null;
}

export function getTriggerEvent(triggerId, eventId) {
  return TRIGGER_EVENTS[triggerId]?.events.find((e) => e.id === eventId) || null;
}

// Default config for a freshly-picked event: { event, eventId } + field defaults.
export function eventDefaults(triggerId, eventId) {
  const ev = getTriggerEvent(triggerId, eventId);
  if (!ev) return {};
  const cfg = { event: ev.event, eventId: ev.id };
  for (const f of ev.fields) {
    if (f.key && f.default !== undefined) cfg[f.key] = f.default;
  }
  return cfg;
}
