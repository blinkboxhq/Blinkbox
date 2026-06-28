import {
  Plus, Pencil, Trash2, Search, GitBranch, GitMerge, GitPullRequest, CircleDot,
  MessageSquare, Star, GitFork, Rocket,
  DollarSign, RefreshCw, Repeat, XCircle, FileText, AlertTriangle, ShoppingCart,
  GitCommit, Tag, Users, Flag, Activity,
  Bug, Bookmark, Layers, UserPlus, ArrowRightCircle, AlertOctagon, CheckCircle2, Clock,
  Play, Ban, Flame, Inbox, Gauge, ShieldAlert,
  ListTodo, CircleDashed, PauseCircle, Archive, Sparkle,
  Briefcase, Building2, Ticket, Trophy, UserCheck, Target,
} from 'lucide-react';

const NOTION_POLL = [
  { value: '* * * * *', label: 'Every minute' },
  { value: '*/5 * * * *', label: 'Every 5 minutes' },
  { value: '*/15 * * * *', label: 'Every 15 minutes' },
  { value: '*/30 * * * *', label: 'Every 30 minutes' },
  { value: '0 * * * *', label: 'Every hour' },
];
const notionBaseFields = [
  { type: 'password', key: 'apiKey', label: 'Notion Integration Token', placeholder: 'secret_…  or  ntn_…',
    hint: '// create an internal integration at notion.so/my-integrations, then share the database with it' },
  { type: 'text', key: 'databaseId', label: 'Database ID', placeholder: '32-char id from the database URL',
    hint: '// open the database as a full page — the id is the part before ?v= in the URL' },
  { type: 'select', key: 'pollInterval', label: 'Check Every', default: '*/5 * * * *', options: NOTION_POLL },
];
const notionVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.id', 'the page id'],
    ['$trigger.url', 'link to the page'],
    ['$trigger.properties', 'all page property values'],
    ['$trigger.created_time', 'when the page was created'],
    ['$trigger.last_edited_time', 'when it was last edited'],
    ...extra,
  ],
});
// A Notion event = the poll engine + an event-specific config slice. Status events
// pre-fill a Status filter (editable); created/edited toggle triggerOnUpdate.
const notionEvent = (id, label, description, icon, configExtra, fields = []) => ({
  id, label, description, icon, event: id, accent: '#e8eaea', configExtra,
  fields: [...notionBaseFields, ...fields, notionVars()],
});
const notionStatusField = (value) => ({
  type: 'text', key: 'filterValue', label: 'Status Value', default: value, placeholder: value,
  hint: '// the exact Status option name in your database — edit if yours differs',
});

const HUBSPOT_POLL = [
  { value: '*/2 * * * *', label: 'Every 2 minutes' },
  { value: '*/5 * * * *', label: 'Every 5 minutes' },
  { value: '*/15 * * * *', label: 'Every 15 minutes' },
  { value: '*/30 * * * *', label: 'Every 30 minutes' },
  { value: '0 * * * *', label: 'Every hour' },
];
const hubspotBaseFields = [
  { type: 'password', key: 'apiKey', label: 'HubSpot Private App Token', placeholder: 'pat-na1-…',
    hint: '// Settings → Integrations → Private Apps → create one with crm.objects.*.read scopes' },
  { type: 'select', key: 'pollInterval', label: 'Check Every', default: '*/5 * * * *', options: HUBSPOT_POLL },
];
const hubspotVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.id', 'the object id'],
    ['$trigger.properties', 'all property values on the object'],
    ['$trigger.createdAt', 'when the object was created'],
    ['$trigger.updatedAt', 'when it was last modified'],
    ...extra,
  ],
});
// A HubSpot event = the CRM search poller + an object-type/property slice.
// objectType picks the CRM endpoint; filterProperty/filterValue add an EQ filter;
// triggerOnUpdate re-fires on every modification instead of once at creation.
const hubspotEvent = (id, label, description, icon, configExtra, fields = [], varsExtra = []) => ({
  id, label, description, icon, event: id, accent: '#ff7a59', configExtra,
  fields: [...hubspotBaseFields, ...fields, hubspotVars(varsExtra)],
});

const LINEAR_POLL = [
  { value: '1', label: 'Every minute' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
];
const linearBaseFields = [
  { type: 'password', key: 'apiKey', label: 'Linear API Key', placeholder: 'lin_api_…',
    hint: '// create one in Linear → Settings → API → Personal API keys' },
  { type: 'text', key: 'teamId', label: 'Team ID (optional)', placeholder: 'leave blank for all teams',
    hint: '// scope this trigger to one team; blank = your whole workspace' },
  { type: 'text', key: 'labelFilter', label: 'Label (optional)', placeholder: 'e.g. Frontend',
    hint: '// only fire on issues carrying this label' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5', options: LINEAR_POLL },
];
const linearVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.title', 'issue title'],
    ['$trigger.status', 'current status'],
    ['$trigger.priorityLabel', 'priority (Urgent…No priority)'],
    ['$trigger.assignee', 'assigned to'],
    ['$trigger.url', 'link to the issue'],
    ...extra,
  ],
});
// `view` selects the real server-side filter the Linear poller runs.
const linearEvent = (view, label, description, icon, extraVars = []) => ({
  id: view, label, description, icon, event: view, accent: '#5E6AD2',
  configExtra: { view },
  fields: [...linearBaseFields, linearVars(extraVars)],
});

const JIRA_POLL = [
  { value: '1', label: 'Every minute' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
];
const jiraBaseFields = [
  { type: 'text', key: 'domain', label: 'Jira Site', placeholder: 'your-team.atlassian.net',
    hint: '// your Atlassian cloud domain — no https://' },
  { type: 'text', key: 'email', label: 'Account Email', placeholder: 'you@company.com',
    hint: '// the email of the Jira account the API token belongs to' },
  { type: 'password', key: 'token', label: 'API Token', placeholder: 'your Jira API token',
    hint: '// create one at id.atlassian.com/manage-profile/security/api-tokens' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5', options: JIRA_POLL },
];
const jiraVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.key', 'issue key (e.g. PROJ-123)'],
    ['$trigger.summary', 'issue summary'],
    ['$trigger.status', 'current status'],
    ['$trigger.assignee', 'assigned to'],
    ['$trigger.url', 'link to the issue'],
    ...extra,
  ],
});
// Each Jira event is just a distinct JQL filter the poller runs. `dedupOn:'updated'`
// lets change-based events re-fire when an issue updates; default 'key' fires once.
// dedupOn rides along in `configExtra` (merged by eventDefaults) — not a visible field.
const jiraEvent = (id, label, description, icon, jql, dedupOn = 'key', extraVars = []) => ({
  id, label, description, icon, event: id, accent: '#2684FF',
  configExtra: { dedupOn },
  fields: [
    ...jiraBaseFields,
    { type: 'textarea', key: 'jql', label: 'JQL Filter', rows: 2, default: jql,
      hint: '// the saved search this event runs — tweak it to scope by project, label, etc.' },
    jiraVars(extraVars),
  ],
});

const GITLAB_POLL = [
  { value: '1', label: 'Every minute' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
];
const gitlabBaseFields = [
  { type: 'text', key: 'projectId', label: 'Project ID or Path', placeholder: '278964  or  group/project',
    hint: '// numeric project id, or url-style namespace/project' },
  { type: 'password', key: 'token', label: 'GitLab Access Token', placeholder: 'glpat-…',
    hint: '// a Personal/Project token with read_api scope — store it once, we keep it encrypted' },
  { type: 'text', key: 'host', label: 'Host (self-managed only)', default: 'gitlab.com', placeholder: 'gitlab.com',
    hint: '// leave as gitlab.com unless you self-host' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5', options: GITLAB_POLL },
];
const gitlabVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.type', 'the event type'],
    ['$trigger.author', 'who created it'],
    ['$trigger.url', 'link to the object'],
    ...extra,
  ],
});
const gitlabEvent = (id, label, description, icon, eventType, extraVars = []) => ({
  id, label, description, icon, event: eventType, accent: '#FC6D26',
  fields: [...gitlabBaseFields, gitlabVars(extraVars)],
});

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
  type: 'credential', key: 'tokenCredentialKey', label: 'GitHub Account',
  oauthProvider: 'github',
  placeholder: 'connect with GitHub',
  hint: '// we register the webhook for you and auto-generate its signing secret — no manual setup',
};
const githubVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.event', 'the GitHub event name'],
    ['$trigger.repoName', 'owner/repo'],
    ['$trigger.sender', 'who triggered it'],
    ...extra,
  ],
});

const stripeSecret = {
  type: 'credential', key: 'webhookSecretCredentialId', label: 'Webhook Signing Secret',
  credType: 'Stripe Webhook Secret',
  placeholder: 'select or create a signing secret',
  hint: '// from Stripe → Developers → Webhooks; store the whsec_… once, reuse everywhere',
};

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

  // ── GITLAB ──────────────────────────────────────────────────
  gitlab: {
    title: 'GitLab',
    subtitle: 'Trigger on activity in a GitLab project',
    events: [
      gitlabEvent('mr_opened', 'Merge Request Opened', 'A new merge request is opened', GitPullRequest, 'merge_request',
        [['$trigger.title', 'MR title'], ['$trigger.sourceBranch', 'source branch'], ['$trigger.targetBranch', 'target branch']]),
      gitlabEvent('mr_merged', 'Merge Request Merged', 'A merge request is merged', GitMerge, 'merge_request_merged',
        [['$trigger.title', 'MR title'], ['$trigger.mergedBy', 'who merged it']]),
      gitlabEvent('issue_opened', 'Issue Opened', 'A new issue is created', CircleDot, 'issue',
        [['$trigger.title', 'issue title'], ['$trigger.labels', 'issue labels']]),
      gitlabEvent('issue_closed', 'Issue Closed', 'An issue is closed', XCircle, 'issue_closed',
        [['$trigger.title', 'issue title'], ['$trigger.closedAt', 'when it closed']]),
      gitlabEvent('pipeline_any', 'Pipeline Run', 'A CI/CD pipeline runs', Activity, 'pipeline',
        [['$trigger.status', 'pipeline status'], ['$trigger.ref', 'branch/tag']]),
      gitlabEvent('pipeline_failed', 'Pipeline Failed', 'A CI/CD pipeline fails', AlertTriangle, 'pipeline_failed',
        [['$trigger.ref', 'branch/tag'], ['$trigger.sha', 'commit sha']]),
      gitlabEvent('commit_pushed', 'Commit Pushed', 'A new commit lands on the repo', GitCommit, 'commit',
        [['$trigger.title', 'commit title'], ['$trigger.sha', 'commit sha']]),
      gitlabEvent('tag_created', 'Tag Created', 'A new git tag is created', Tag, 'tag',
        [['$trigger.tag', 'tag name'], ['$trigger.sha', 'commit sha']]),
      gitlabEvent('release_published', 'Release Published', 'A new release is published', Rocket, 'release',
        [['$trigger.tag', 'release tag'], ['$trigger.title', 'release name']]),
      gitlabEvent('branch_created', 'Branch Created', 'A new branch appears', GitBranch, 'branch',
        [['$trigger.branch', 'branch name'], ['$trigger.default', 'is default branch']]),
      gitlabEvent('member_added', 'Member Added', 'Someone is added to the project', Users, 'member',
        [['$trigger.memberName', 'member name'], ['$trigger.accessLevel', 'access level']]),
      gitlabEvent('milestone_created', 'Milestone Created', 'A new milestone is created', Flag, 'milestone',
        [['$trigger.title', 'milestone title'], ['$trigger.dueDate', 'due date']]),
    ],
  },

  // ── JIRA ────────────────────────────────────────────────────
  jira: {
    title: 'Jira',
    subtitle: 'Trigger on issue activity in your Jira project',
    events: [
      jiraEvent('issue_created', 'Issue Created', 'Any new issue is created', Plus,
        'created >= -15m ORDER BY created DESC'),
      jiraEvent('issue_updated', 'Issue Updated', 'Any issue is edited or changed', Pencil,
        'updated >= -15m ORDER BY updated DESC', 'updated'),
      jiraEvent('issue_assigned', 'Issue Assigned to Me', 'An issue is assigned to the current user', UserPlus,
        'assignee = currentUser() AND updated >= -15m ORDER BY updated DESC', 'updated',
        [['$trigger.assignee', 'the assignee']]),
      jiraEvent('status_changed', 'Status Changed', 'An issue moves to a new status', ArrowRightCircle,
        'status CHANGED AFTER -15m ORDER BY updated DESC', 'updated',
        [['$trigger.status', 'the new status']]),
      jiraEvent('issue_done', 'Issue Done', 'An issue is moved to Done', CheckCircle2,
        'statusCategory = Done AND updated >= -15m ORDER BY updated DESC', 'updated'),
      jiraEvent('issue_commented', 'Issue Commented', 'A comment is added to an issue', MessageSquare,
        'updated >= -15m AND comment ~ "*" ORDER BY updated DESC', 'updated'),
      jiraEvent('bug_created', 'Bug Reported', 'A new Bug-type issue is created', Bug,
        'issuetype = Bug AND created >= -15m ORDER BY created DESC'),
      jiraEvent('story_created', 'Story Created', 'A new Story is created', Bookmark,
        'issuetype = Story AND created >= -15m ORDER BY created DESC'),
      jiraEvent('epic_created', 'Epic Created', 'A new Epic is created', Layers,
        'issuetype = Epic AND created >= -15m ORDER BY created DESC'),
      jiraEvent('high_priority', 'High-Priority Issue', 'A High or Highest priority issue appears', AlertOctagon,
        'priority IN (High, Highest) AND created >= -15m ORDER BY created DESC',
        'key', [['$trigger.priority', 'the priority']]),
      jiraEvent('overdue', 'Issue Overdue', 'An open issue passes its due date', Clock,
        'duedate < now() AND statusCategory != Done ORDER BY duedate ASC', 'updated'),
      jiraEvent('reopened', 'Issue Reopened', 'A done issue is moved back to open', RefreshCw,
        'status CHANGED FROM ("Done", "Closed", "Resolved") AFTER -15m ORDER BY updated DESC', 'updated',
        [['$trigger.status', 'the new status']]),
    ],
  },

  // ── LINEAR ──────────────────────────────────────────────────
  linear: {
    title: 'Linear',
    subtitle: 'Trigger on issue activity in your Linear workspace',
    events: [
      linearEvent('issue_created', 'Issue Created', 'Any new issue is created', Plus),
      linearEvent('issue_updated', 'Issue Updated', 'Any issue is edited', Pencil),
      linearEvent('issue_started', 'Issue Started', 'An issue moves into an In-Progress state', Play),
      linearEvent('issue_completed', 'Issue Completed', 'An issue is marked Done', CheckCircle2),
      linearEvent('issue_canceled', 'Issue Canceled', 'An issue is canceled', Ban),
      linearEvent('urgent', 'Urgent Issue', 'An issue is set to Urgent priority', Flame,
        [['$trigger.priorityLabel', 'always "Urgent"']]),
      linearEvent('high_priority', 'High-Priority Issue', 'An open High or Urgent issue appears', AlertOctagon),
      linearEvent('unassigned', 'Unassigned Issue', 'An active issue has no assignee', Inbox),
      linearEvent('no_estimate', 'Missing Estimate', 'An open issue has no estimate set', Gauge),
      linearEvent('blocked', 'Issue Blocked', 'An issue is labelled Blocked', ShieldAlert),
    ],
  },

  // ── NOTION ──────────────────────────────────────────────────
  notion: {
    title: 'Notion',
    subtitle: 'Trigger on new or changed pages in a Notion database',
    events: [
      notionEvent('page_created', 'Page Created', 'A new page (row) is added to the database', Plus,
        { triggerOnUpdate: false }),
      notionEvent('page_edited', 'Page Edited', 'Any page in the database is edited', Pencil,
        { triggerOnUpdate: true }),
      notionEvent('status_done', 'Status → Done', 'A page moves to the Done status', CheckCircle2,
        { triggerOnUpdate: true, filterProperty: 'Status' }, [notionStatusField('Done')]),
      notionEvent('status_in_progress', 'Status → In Progress', 'A page moves to In Progress', Play,
        { triggerOnUpdate: true, filterProperty: 'Status' }, [notionStatusField('In progress')]),
      notionEvent('status_todo', 'Status → To Do', 'A page moves to a not-started status', ListTodo,
        { triggerOnUpdate: true, filterProperty: 'Status' }, [notionStatusField('Not started')]),
      notionEvent('status_blocked', 'Status → Blocked', 'A page moves to a Blocked status', ShieldAlert,
        { triggerOnUpdate: true, filterProperty: 'Status' }, [notionStatusField('Blocked')]),
      notionEvent('status_review', 'Status → In Review', 'A page moves to In Review', CircleDashed,
        { triggerOnUpdate: true, filterProperty: 'Status' }, [notionStatusField('In review')]),
      notionEvent('status_archived', 'Status → Archived', 'A page moves to Archived', Archive,
        { triggerOnUpdate: true, filterProperty: 'Status' }, [notionStatusField('Archived')]),
      notionEvent('category_match', 'Property Equals…', 'A page whose select-property matches a value', Sparkle,
        { triggerOnUpdate: true, filterType: 'select' }, [
          { type: 'text', key: 'filterProperty', label: 'Property Name', placeholder: 'e.g. Priority',
            hint: '// the name of a Select property in your database' },
          { type: 'text', key: 'filterValue', label: 'Equals', placeholder: 'e.g. High',
            hint: '// fire only when that property equals this value' },
        ]),
      notionEvent('priority_high', 'Priority → High', 'A page with Priority set to High', Flame,
        { triggerOnUpdate: true, filterProperty: 'Priority', filterType: 'select' }, [
          { type: 'text', key: 'filterValue', label: 'Priority Value', default: 'High', placeholder: 'High',
            hint: '// the exact Priority option name in your database' },
        ]),
    ],
  },

  hubspot: {
    title: 'HubSpot',
    subtitle: 'Trigger on new or changed CRM records — contacts, deals, companies, tickets',
    events: [
      hubspotEvent('contact_created', 'Contact Created', 'A new contact is added to your CRM', UserPlus,
        { objectType: 'contacts', triggerOnUpdate: false }, [],
        [['$trigger.properties.email', "the contact's email"], ['$trigger.properties.firstname', 'first name']]),
      hubspotEvent('contact_updated', 'Contact Updated', 'Any property on a contact changes', Pencil,
        { objectType: 'contacts', triggerOnUpdate: true }, [],
        [['$trigger.properties.email', "the contact's email"]]),
      hubspotEvent('contact_became_lead', 'Contact → Lead', 'A contact reaches the Lead lifecycle stage', Target,
        { objectType: 'contacts', triggerOnUpdate: true, filterProperty: 'lifecyclestage', filterValue: 'lead' }, [],
        [['$trigger.properties.lifecyclestage', 'now "lead"']]),
      hubspotEvent('contact_became_customer', 'Contact → Customer', 'A contact reaches the Customer lifecycle stage', UserCheck,
        { objectType: 'contacts', triggerOnUpdate: true, filterProperty: 'lifecyclestage', filterValue: 'customer' }, [],
        [['$trigger.properties.lifecyclestage', 'now "customer"']]),
      hubspotEvent('deal_created', 'Deal Created', 'A new deal enters any pipeline', Briefcase,
        { objectType: 'deals', triggerOnUpdate: false }, [],
        [['$trigger.properties.dealname', 'the deal name'], ['$trigger.properties.amount', 'deal value']]),
      hubspotEvent('deal_updated', 'Deal Updated', 'Any property on a deal changes', RefreshCw,
        { objectType: 'deals', triggerOnUpdate: true }, [],
        [['$trigger.properties.dealstage', 'current stage']]),
      hubspotEvent('deal_won', 'Deal Won', 'A deal moves to Closed Won', Trophy,
        { objectType: 'deals', triggerOnUpdate: true, filterProperty: 'dealstage', filterValue: 'closedwon' }, [],
        [['$trigger.properties.amount', 'the won amount']]),
      hubspotEvent('deal_lost', 'Deal Lost', 'A deal moves to Closed Lost', XCircle,
        { objectType: 'deals', triggerOnUpdate: true, filterProperty: 'dealstage', filterValue: 'closedlost' }, [],
        [['$trigger.properties.dealname', 'the lost deal']]),
      hubspotEvent('company_created', 'Company Created', 'A new company record is added', Building2,
        { objectType: 'companies', triggerOnUpdate: false }, [],
        [['$trigger.properties.name', 'company name'], ['$trigger.properties.domain', 'website domain']]),
      hubspotEvent('ticket_created', 'Ticket Created', 'A new support ticket is opened', Ticket,
        { objectType: 'tickets', triggerOnUpdate: false }, [],
        [['$trigger.properties.subject', 'ticket subject'], ['$trigger.properties.hs_ticket_priority', 'priority']]),
      hubspotEvent('ticket_urgent', 'Ticket → High Priority', 'A ticket is set to High priority', Flame,
        { objectType: 'tickets', triggerOnUpdate: true, filterProperty: 'hs_ticket_priority', filterValue: 'HIGH' }, [],
        [['$trigger.properties.subject', 'the urgent ticket']]),
      hubspotEvent('object_property_equals', 'Property Equals…', 'Any object where a property matches a value', Sparkle,
        { triggerOnUpdate: true }, [
          { type: 'pills', key: 'objectType', label: 'Object', default: 'contacts', options: [
            { value: 'contacts', label: 'Contacts' }, { value: 'deals', label: 'Deals' },
            { value: 'companies', label: 'Companies' }, { value: 'tickets', label: 'Tickets' },
          ] },
          { type: 'text', key: 'filterProperty', label: 'Property', placeholder: 'e.g. hs_lead_status',
            hint: '// the internal property name (not the label)' },
          { type: 'text', key: 'filterValue', label: 'Equals', placeholder: 'e.g. NEW',
            hint: '// fire only when that property equals this value' },
        ]),
    ],
  },
};

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
  const cfg = { event: ev.event, eventType: ev.event, eventId: ev.id, ...(ev.configExtra || {}) };
  for (const f of ev.fields) {
    if (f.key && f.default !== undefined) cfg[f.key] = f.default;
  }
  return cfg;
}
