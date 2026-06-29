import {
  Plus, Pencil, Trash2, Search, GitBranch, GitMerge, GitPullRequest, CircleDot,
  MessageSquare, Star, GitFork, Rocket,
  DollarSign, RefreshCw, Repeat, XCircle, FileText, AlertTriangle, ShoppingCart,
  GitCommit, Tag, Users, Flag, Activity,
  Bug, Bookmark, Layers, UserPlus, ArrowRightCircle, AlertOctagon, CheckCircle2, Clock,
  Play, Ban, Flame, Inbox, Gauge, ShieldAlert,
  ListTodo, CircleDashed, PauseCircle, Archive, Sparkle,
  Briefcase, Building2, Ticket, Trophy, UserCheck, Target,
  Paperclip, CheckSquare, UserMinus, Copy, Calendar, Type,
  Handshake, Phone, StickyNote, User, CheckCheck, AlertCircle,
  Database, Hash, CalendarClock, Eye, Square, Code, Circle,
  Mail, MailOpen, AtSign, Reply, Send, Globe, Heart,
  FolderPlus, Image, Film, FileSpreadsheet, FileType, HardDrive,
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

const TRELLO_POLL = [
  { value: '1', label: 'Every minute' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
];
const trelloListFilter = {
  type: 'text', key: 'listFilter', label: 'Limit to List (optional)', placeholder: 'e.g. Done',
  hint: '// only fire for cards in a list whose name contains this — leave blank for the whole board',
};
const trelloBaseFields = [
  { type: 'password', key: 'apiKey', label: 'Trello API Key', placeholder: 'from trello.com/app-key',
    hint: '// grab your key at trello.com/app-key' },
  { type: 'password', key: 'token', label: 'Trello Token', placeholder: 'token generated from your API key',
    hint: '// click "Token" on the app-key page and authorize read access' },
  { type: 'text', key: 'boardId', label: 'Board ID', placeholder: '24-char id from the board URL',
    hint: '// add .json to a board URL, or copy the id segment after /b/' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5', options: TRELLO_POLL },
];
const trelloVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.cardName', 'the card title'],
    ['$trigger.cardId', 'the card id'],
    ['$trigger.listName', 'the list the card is in'],
    ['$trigger.memberName', 'who performed the action'],
    ['$trigger.url', 'link to the card'],
    ['$trigger.date', 'when it happened'],
    ...extra,
  ],
});
// A Trello event = one Trello "action" type from the board actions feed, narrowed
// server-side by `filter` and refined in the poller's `match`. `actionType` selects it.
const trelloEvent = (id, label, description, icon, varsExtra = [], includeListFilter = true) => ({
  id, label, description, icon, event: id, accent: '#0079bf',
  configExtra: { actionType: id },
  fields: [...trelloBaseFields, ...(includeListFilter ? [trelloListFilter] : []), trelloVars(varsExtra)],
});

const PIPEDRIVE_POLL = [
  { value: '2', label: 'Every 2 minutes' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
];
const pipedriveBaseFields = [
  { type: 'password', key: 'apiToken', label: 'Pipedrive API Token', placeholder: 'from Settings → Personal → API',
    hint: '// Settings → Personal preferences → API → copy your personal token' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5', options: PIPEDRIVE_POLL },
];
const pipedriveVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.id', 'the record id'],
    ['$trigger.ownerName', 'the record owner'],
    ['$trigger.addTime', 'when the record was created'],
    ...extra,
  ],
});
// A Pipedrive event = a REST endpoint + status params + match predicate in the
// poller. `eventType` (via configExtra) selects the PIPEDRIVE_SCOPES entry.
const pipedriveEvent = (id, label, description, icon, varsExtra = [], fields = []) => ({
  id, label, description, icon, event: id, accent: '#017737',
  configExtra: { eventType: id },
  fields: [...pipedriveBaseFields, ...fields, pipedriveVars(varsExtra)],
});

const ASANA_POLL = [
  { value: '2', label: 'Every 2 minutes' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
];
const asanaBaseFields = [
  { type: 'password', key: 'token', label: 'Asana Personal Access Token', placeholder: 'from My Settings → Apps → Developer apps',
    hint: '// Asana → My Settings → Apps → Manage Developer Apps → Personal access token' },
  { type: 'text', key: 'projectId', label: 'Project ID', placeholder: '1201234567890123',
    hint: '// the long number in your project URL: app.asana.com/0/<PROJECT_ID>/list' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5', options: ASANA_POLL },
];
const asanaVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.gid', 'the task id'],
    ['$trigger.name', 'the task name'],
    ['$trigger.assignee', 'who it is assigned to'],
    ['$trigger.url', 'a direct link to the task'],
    ...extra,
  ],
});
// An Asana event = a match predicate over the enriched task list in the poller.
// `eventType` (via configExtra) selects the ASANA_MATCH entry.
const asanaEvent = (id, label, description, icon, varsExtra = [], fields = []) => ({
  id, label, description, icon, event: id, accent: '#F06A6A',
  configExtra: { eventType: id },
  fields: [...asanaBaseFields, ...fields, asanaVars(varsExtra)],
});

const GMAIL_POLL = [
  { value: '* * * * *', label: 'Every minute' },
  { value: '*/5 * * * *', label: 'Every 5 minutes' },
  { value: '*/15 * * * *', label: 'Every 15 minutes' },
  { value: '*/30 * * * *', label: 'Every 30 minutes' },
  { value: '0 * * * *', label: 'Every hour' },
];
const gmailBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'Gmail Account', provider: 'google',
    hint: '// connect the Gmail account to watch (OAuth — no password stored)' },
  { type: 'select', key: 'pollInterval', label: 'Check Every', default: '*/5 * * * *', options: GMAIL_POLL },
];
const gmailVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.from', 'the sender'],
    ['$trigger.subject', 'the email subject'],
    ['$trigger.snippet', 'a short preview of the body'],
    ['$trigger.id', 'the message id'],
    ...extra,
  ],
});
// A Gmail event = a distinct Gmail search query baked into configExtra.query.
// The poller already passes `query` straight to the Gmail API `q` param, so no
// backend change is needed — each event is a genuinely different inbox slice.
const gmailEvent = (id, label, description, icon, query, varsExtra = [], fields = []) => ({
  id, label, description, icon, event: id, accent: '#EA4335',
  configExtra: { query },
  fields: [...gmailBaseFields, ...fields, gmailVars(varsExtra)],
});

const OUTLOOK_POLL = [
  { value: '1', label: 'Every minute' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
];
const outlookBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'Outlook Account', provider: 'microsoft',
    hint: '// connect the Microsoft 365 / Outlook account to watch (OAuth)' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5', options: OUTLOOK_POLL },
];
const outlookVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.from', 'the sender address'],
    ['$trigger.subject', 'the email subject'],
    ['$trigger.preview', 'a short body preview'],
    ['$trigger.id', 'the message id'],
    ...extra,
  ],
});
// An Outlook event = a Graph mail folder + a $filter slice in the poller.
// `eventType` (via configExtra) selects the OUTLOOK_EVENTS entry.
const outlookEvent = (id, label, description, icon, varsExtra = [], fields = []) => ({
  id, label, description, icon, event: id, accent: '#0A66C2',
  configExtra: { eventType: id },
  fields: [...outlookBaseFields, ...fields, outlookVars(varsExtra)],
});

const MASTODON_POLL = [
  { value: '1', label: 'Every minute' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
];
const mastodonBaseFields = [
  { type: 'text', key: 'instanceUrl', label: 'Instance URL', placeholder: 'mastodon.social',
    hint: '// your Mastodon server, e.g. mastodon.social or fosstodon.org' },
  { type: 'password', key: 'accessToken', label: 'Access Token', placeholder: 'from Preferences → Development',
    hint: '// Preferences → Development → New application → copy the access token' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5', options: MASTODON_POLL },
];
const mastodonVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.accountName', 'the account handle'],
    ['$trigger.statusContent', 'the post text'],
    ['$trigger.statusUrl', 'a link to the post'],
    ...extra,
  ],
});
// A Mastodon event = a distinct API endpoint (notification type or timeline).
// `eventType` (via configExtra) selects the MASTODON_EVENTS entry.
const mastodonEvent = (id, label, description, icon, varsExtra = [], fields = []) => ({
  id, label, description, icon, event: id, accent: '#6364FF',
  configExtra: { eventType: id },
  fields: [...mastodonBaseFields, ...fields, mastodonVars(varsExtra)],
});

const GDRIVE_POLL = [
  { value: '1', label: 'Every minute' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
];
const gdriveBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'Google Account', provider: 'google',
    hint: '// connect the Google account whose Drive you want to watch (OAuth)' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5', options: GDRIVE_POLL },
];
const gdriveFolderField = { type: 'text', key: 'folderId', label: 'Limit To Folder (optional)', placeholder: 'folder id from the Drive URL',
  hint: '// optional — only fire for files directly inside this folder id' };
const gdriveVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.name', 'the file name'],
    ['$trigger.fileId', 'the Drive file id'],
    ['$trigger.webViewLink', 'a link to open the file'],
    ['$trigger.mimeType', 'the file type'],
    ...extra,
  ],
});
// A Drive event = a client-side predicate over the change stream in the poller.
// `eventType` (via configExtra) selects the DRIVE_EVENTS entry.
const gdriveEvent = (id, label, description, icon, varsExtra = [], extraFields = [gdriveFolderField]) => ({
  id, label, description, icon, event: id, accent: '#1FA463',
  configExtra: { eventType: id },
  fields: [...gdriveBaseFields, ...extraFields, gdriveVars(varsExtra)],
});

const GCAL_POLL = [
  { value: '1', label: 'Every minute' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
];
const gcalBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'Google Account', provider: 'google',
    hint: '// connect the Google account whose calendar you want to watch (OAuth)' },
  { type: 'text', key: 'calendarId', label: 'Calendar', default: 'primary', placeholder: 'primary',
    hint: '// leave as "primary" for your main calendar, or paste another calendar id' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5', options: GCAL_POLL },
];
const gcalLeadField = { type: 'text', key: 'minutesBefore', label: 'Minutes Before Start', default: '0', placeholder: '0',
  hint: '// fire this many minutes before the event begins (0 = right as it starts)' };
const gcalFilterField = { type: 'text', key: 'filterQuery', label: 'Title Contains (optional)', placeholder: 'e.g. standup',
  hint: '// optional — only fire for events whose title/description matches this text' };
const gcalVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.title', 'the event title'],
    ['$trigger.startTime', 'when the event starts'],
    ['$trigger.endTime', 'when the event ends'],
    ['$trigger.organizer', "the organizer's email"],
    ...extra,
  ],
});
// A Calendar event = a query MODE + a client-side predicate in the poller.
// `eventType` (via configExtra) selects the CAL_EVENTS entry. Upcoming-mode
// events expose the lead-time field; change-mode events don't.
const gcalEvent = (id, label, description, icon, varsExtra = [], extraFields = [gcalLeadField, gcalFilterField]) => ({
  id, label, description, icon, event: id, accent: '#4285F4',
  configExtra: { eventType: id },
  fields: [...gcalBaseFields, ...extraFields, gcalVars(varsExtra)],
});

const ONEDRIVE_POLL = [
  { value: '1', label: 'Every minute' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
];
const onedriveBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'Microsoft Account', provider: 'microsoft',
    hint: '// connect the Microsoft account whose OneDrive you want to watch (OAuth)' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5', options: ONEDRIVE_POLL },
];
const onedriveFolderField = { type: 'text', key: 'folderId', label: 'Limit To Folder (optional)', placeholder: 'OneDrive folder item id',
  hint: '// optional — only watch changes inside this folder item id' };
const onedriveVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.name', 'the file or folder name'],
    ['$trigger.itemId', 'the OneDrive item id'],
    ['$trigger.webUrl', 'a link to open the item'],
    ['$trigger.lastModifiedBy', 'who last changed it'],
    ...extra,
  ],
});
// A OneDrive event = a client-side predicate over the Graph delta stream in
// the poller. `eventType` (via configExtra) selects the ONEDRIVE_EVENTS entry.
const onedriveEvent = (id, label, description, icon, varsExtra = [], extraFields = [onedriveFolderField]) => ({
  id, label, description, icon, event: id, accent: '#0078D4',
  configExtra: { eventType: id },
  fields: [...onedriveBaseFields, ...extraFields, onedriveVars(varsExtra)],
});

const YOUTUBE_POLL = [
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
  { value: '180', label: 'Every 3 hours' },
];
const youtubeBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'YouTube API Key', provider: 'google',
    hint: '// a YouTube Data API v3 key (stored encrypted as a credential)' },
  { type: 'text', key: 'channelId', label: 'Channel ID', placeholder: 'UCxxxxxxxxxxxxxxxxxxxxxx',
    hint: '// the channel to watch — the UC… id from the channel URL' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '15', options: YOUTUBE_POLL },
];
const youtubeVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.title', 'the video or item title'],
    ['$trigger.url', 'the YouTube link'],
    ['$trigger.channelTitle', 'the channel name'],
    ['$trigger.publishedAt', 'when it was published'],
    ...extra,
  ],
});
// A YouTube event = a distinct Data API call in the poller. `eventType` (via
// configExtra) selects the YT_EVENTS entry.
const youtubeEvent = (id, label, description, icon, varsExtra = [], extraFields = []) => ({
  id, label, description, icon, event: id, accent: '#FF0000',
  configExtra: { eventType: id },
  fields: [...youtubeBaseFields, ...extraFields, youtubeVars(varsExtra)],
});

const SHAREPOINT_POLL = [
  { value: '1', label: 'Every minute' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
];
const sharepointBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'Microsoft Account', provider: 'microsoft',
    hint: '// connect the Microsoft account with access to the SharePoint site (OAuth)' },
  { type: 'text', key: 'siteId', label: 'Site ID', placeholder: 'contoso.sharepoint.com,guid,guid',
    hint: '// the Graph site id of the SharePoint site' },
  { type: 'text', key: 'listId', label: 'List ID', placeholder: 'list guid',
    hint: '// the id of the list (or library) whose items you want to watch' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5', options: SHAREPOINT_POLL },
];
const sharepointColumnField = { type: 'text', key: 'columnName', label: 'Column Name', placeholder: 'e.g. Status',
  hint: '// the internal name of the list column to inspect' };
const sharepointVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.itemId', 'the list item id'],
    ['$trigger.webUrl', 'a link to the item'],
    ['$trigger.fields', 'all column values for the item'],
    ['$trigger.lastModified', 'when it was last changed'],
    ...extra,
  ],
});
// A SharePoint event = a client-side predicate over the list-item delta stream.
// `eventType` (via configExtra) selects the SHAREPOINT_EVENTS entry.
const sharepointEvent = (id, label, description, icon, varsExtra = [], extraFields = []) => ({
  id, label, description, icon, event: id, accent: '#0078D4',
  configExtra: { eventType: id },
  fields: [...sharepointBaseFields, ...extraFields, sharepointVars(varsExtra)],
});

const DOCS_POLL = [
  { value: '1', label: 'Every minute' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
];
const docsBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'Google Account', provider: 'google',
    hint: '// connect the Google account that can open the doc (OAuth)' },
  { type: 'text', key: 'docId', label: 'Document ID', placeholder: 'the id from the doc URL',
    hint: '// the long id between /d/ and /edit in the document URL' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5', options: DOCS_POLL },
];
const docsVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.docName', 'the document title'],
    ['$trigger.modifiedBy', 'who made the edit'],
    ['$trigger.webViewLink', 'a link to open the doc'],
    ['$trigger.wordCount', 'the document word count'],
    ...extra,
  ],
});
// A Docs event = a predicate over the doc revision + a content snapshot diff in
// the poller. `eventType` (via configExtra) selects the DOCS_EVENTS entry.
const docsEvent = (id, label, description, icon, varsExtra = [], extraFields = []) => ({
  id, label, description, icon, event: id, accent: '#4285F4',
  configExtra: { eventType: id },
  fields: [...docsBaseFields, ...extraFields, docsVars(varsExtra)],
});

const FORMS_POLL = [
  { value: '1', label: 'Every minute' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
];
const formsBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'Google Account', provider: 'google',
    hint: '// connect the Google account that owns the form (OAuth)' },
  { type: 'text', key: 'formId', label: 'Form ID', placeholder: 'the id from the form edit URL',
    hint: '// the long id in the form URL after /forms/d/' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5', options: FORMS_POLL },
];
const formsQuestionField = { type: 'text', key: 'questionTitle', label: 'Question', placeholder: 'exact question title',
  hint: '// type the question label exactly as it appears on the form' };
const formsVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.respondentEmail', 'the respondent email (if collected)'],
    ['$trigger.submittedAt', 'when it was submitted'],
    ['$trigger.answersByTitle', 'answers keyed by question title'],
    ...extra,
  ],
});
// A Forms event = a predicate over a response in the poller. Question events
// read questionTitle + targetValue. `eventType` (via configExtra) selects it.
const formsEvent = (id, label, description, icon, varsExtra = [], extraFields = []) => ({
  id, label, description, icon, event: id, accent: '#7248B9',
  configExtra: { eventType: id },
  fields: [...formsBaseFields, ...extraFields, formsVars(varsExtra)],
});

const SHEETS_POLL = [
  { value: '1', label: 'Every minute' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
];
const sheetsBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'Google Account', provider: 'google',
    hint: '// connect the Google account that owns the sheet (OAuth)' },
  { type: 'text', key: 'spreadsheetId', label: 'Spreadsheet ID', placeholder: '1AbC…the long id from the sheet URL',
    hint: '// the id between /d/ and /edit in the spreadsheet URL' },
  { type: 'text', key: 'range', label: 'Sheet / Range', placeholder: 'Sheet1', default: 'Sheet1',
    hint: '// a tab name like Sheet1, or a range like Sheet1!A:F' },
  { type: 'switch-row', key: 'hasHeader', label: 'First Row Is A Header', default: true,
    hint: '// on = use row 1 as column names so variables read like $trigger.Email' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5', options: SHEETS_POLL },
];
const sheetsColumnField = { type: 'text', key: 'columnName', label: 'Column', placeholder: 'e.g. Status (header name, A, or 0)',
  hint: '// which column to watch — a header name, an A1 letter, or a 0-based index' };
const sheetsVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.<column>', 'each column by its header name'],
    ['$trigger._rowNumber', 'the row number in the sheet'],
    ['$trigger._changeKind', 'added, updated or deleted'],
    ...extra,
  ],
});
// A Sheets event = a change kind (add/update/delete) + an optional column
// predicate in the poller. `eventType` (via configExtra) selects SHEETS_EVENTS.
const sheetsEvent = (id, label, description, icon, varsExtra = [], extraFields = []) => ({
  id, label, description, icon, event: id, accent: '#0F9D58',
  configExtra: { eventType: id },
  fields: [...sheetsBaseFields, ...extraFields, sheetsVars(varsExtra)],
});

const TEAMS_POLL = [
  { value: '1', label: 'Every minute' },
  { value: '2', label: 'Every 2 minutes' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
];
const teamsBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'Microsoft Account', provider: 'microsoft',
    hint: '// connect the Microsoft account that can read this team channel (OAuth)' },
  { type: 'text', key: 'teamId', label: 'Team ID', placeholder: '00000000-0000-0000-0000-000000000000',
    hint: '// the team (group) id — copy it from the Teams channel link' },
  { type: 'text', key: 'channelId', label: 'Channel ID', placeholder: '19:xxxxx@thread.tacv2',
    hint: '// the channel id from the channel link (the 19:… value)' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '2', options: TEAMS_POLL },
];
const teamsVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.text', 'the message text (HTML stripped)'],
    ['$trigger.author', 'who posted it'],
    ['$trigger.createdAt', 'when it was posted'],
    ['$trigger.webUrl', 'a link to open the message in Teams'],
    ...extra,
  ],
});
// A Teams event = a client-side predicate over the channel message stream in
// the poller. `eventType` (via configExtra) selects the TEAMS_EVENTS entry.
const teamsEvent = (id, label, description, icon, varsExtra = [], extraFields = []) => ({
  id, label, description, icon, event: id, accent: '#6264A7',
  configExtra: { eventType: id },
  fields: [...teamsBaseFields, ...extraFields, teamsVars(varsExtra)],
});

// Datadog reads a raw API key + Application key (not OAuth), so these are
// password fields — the picker stores the literal keys the poller sends to
// the Events API. `eventType` (via configExtra) selects the DATADOG_EVENTS entry.
const datadogBaseFields = [
  { type: 'password', key: 'apiKey', label: 'Datadog API Key',
    hint: '// Organization Settings → API Keys → copy a key' },
  { type: 'password', key: 'appKey', label: 'Datadog Application Key',
    hint: '// Organization Settings → Application Keys → copy a key (needed to read events)' },
  { type: 'text', key: 'tags', label: 'Tag Filter (optional)', placeholder: 'env:prod,service:api',
    hint: '// only pull events with these tags — leave blank for all' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '2', options: TEAMS_POLL },
];
const datadogTargetField = (label, placeholder, hint) =>
  ({ type: 'text', key: 'targetValue', label, placeholder, hint });
const datadogVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.title', 'the event title'],
    ['$trigger.text', 'the event body'],
    ['$trigger.alertType', 'error / warning / success / info'],
    ['$trigger.priority', 'normal or low'],
    ['$trigger.host', 'the host the event came from'],
    ['$trigger.url', 'a link to the event in Datadog'],
    ...extra,
  ],
});
const datadogEvent = (id, label, description, icon, extraFields = [], varsExtra = []) => ({
  id, label, description, icon, event: id, accent: '#632CA6',
  configExtra: { eventType: id },
  fields: [...datadogBaseFields, ...extraFields, datadogVars(varsExtra)],
});

// ClickUp authenticates with a Personal API token stored in the credential
// vault (resolved at poll time). The user picks one List to watch; the poller
// diffs its tasks. `eventType` (via configExtra) selects the CLICKUP_EVENTS entry.
// Calendly authenticates with a personal access token (vault credential). The
// poller resolves the user, watches their scheduled-events feed, and `eventType`
// (via configExtra) selects the CALENDLY_EVENTS predicate over each booking.
const calendlyBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'Calendly Account', credType: 'calendly',
    hint: '// connect with a personal access token or OAuth' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5',
    options: [
      { value: '1', label: 'Every minute' },
      { value: '5', label: 'Every 5 minutes' },
      { value: '15', label: 'Every 15 minutes' },
      { value: '60', label: 'Every hour' },
    ] },
];
const calendlyTargetField = (label, placeholder, hint) =>
  ({ type: 'text', key: 'targetValue', label, placeholder, hint });
const calendlyVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.eventId', 'the scheduled-event id'],
    ['$trigger.name', 'the event-type name'],
    ['$trigger.status', 'active / canceled'],
    ['$trigger.startTime', 'when it starts (ISO)'],
    ['$trigger.location', 'meeting location / link'],
    ...extra,
  ],
});
const calendlyEvent = (id, label, description, icon, extraFields = [], varsExtra = []) => ({
  id, label, description, icon, event: id, accent: '#006BFF',
  configExtra: { eventType: id },
  fields: [...calendlyBaseFields, ...extraFields, calendlyVars(varsExtra)],
});

// Intercom authenticates with an access token (vault credential). The poller
// watches the workspace's conversation feed; `eventType` (via configExtra)
// selects the INTERCOM_EVENTS predicate over each conversation.
const intercomBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'Intercom Account', credType: 'intercom',
    hint: '// connect the workspace (access token or OAuth)' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5',
    options: [
      { value: '1', label: 'Every minute' },
      { value: '5', label: 'Every 5 minutes' },
      { value: '15', label: 'Every 15 minutes' },
      { value: '60', label: 'Every hour' },
    ] },
];
const intercomTargetField = (label, placeholder, hint) =>
  ({ type: 'text', key: 'targetValue', label, placeholder, hint });
const intercomVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.conversationId', 'the conversation id'],
    ['$trigger.state', 'open / closed / snoozed'],
    ['$trigger.priority', 'priority / not_priority'],
    ['$trigger.author', 'who started it'],
    ['$trigger.assigneeId', 'the assigned teammate id'],
    ...extra,
  ],
});
const intercomEvent = (id, label, description, icon, extraFields = [], varsExtra = []) => ({
  id, label, description, icon, event: id, accent: '#1F8DED',
  configExtra: { eventType: id },
  fields: [...intercomBaseFields, ...extraFields, intercomVars(varsExtra)],
});

// Zendesk authenticates with an email + API token pair stored as a single
// vault credential. The poller watches a subdomain's ticket feed;
// `eventType` (via configExtra) selects the ZENDESK_EVENTS predicate.
const zendeskBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'Zendesk Account', credType: 'zendesk',
    hint: '// connect the account (agent email + API token)' },
  { type: 'text', key: 'subdomain', label: 'Subdomain', placeholder: 'acme',
    hint: '// the acme in acme.zendesk.com' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5',
    options: [
      { value: '1', label: 'Every minute' },
      { value: '5', label: 'Every 5 minutes' },
      { value: '15', label: 'Every 15 minutes' },
      { value: '60', label: 'Every hour' },
    ] },
];
const zendeskTargetField = (label, placeholder, hint) =>
  ({ type: 'text', key: 'targetValue', label, placeholder, hint });
const zendeskVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.subject', 'the ticket subject'],
    ['$trigger.status', 'status (new/open/pending/solved)'],
    ['$trigger.priority', 'priority (low/normal/high/urgent)'],
    ['$trigger.assigneeId', 'the assigned agent id'],
    ['$trigger.ticketId', 'the ticket id'],
    ...extra,
  ],
});
const zendeskEvent = (id, label, description, icon, extraFields = [], varsExtra = []) => ({
  id, label, description, icon, event: id, accent: '#17494D',
  configExtra: { eventType: id },
  fields: [...zendeskBaseFields, ...extraFields, zendeskVars(varsExtra)],
});

// Monday.com authenticates with an API token (vault credential). The poller
// watches one board's items via GraphQL; `eventType` (via configExtra)
// selects the MONDAY_EVENTS predicate over each item.
const mondayBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'Monday Account', credType: 'monday',
    hint: '// paste a monday.com API v2 token (or connect via OAuth)' },
  { type: 'text', key: 'boardId', label: 'Board ID', placeholder: '1234567890',
    hint: '// the board to watch — copy the id from the board URL' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5',
    options: [
      { value: '1', label: 'Every minute' },
      { value: '5', label: 'Every 5 minutes' },
      { value: '15', label: 'Every 15 minutes' },
      { value: '60', label: 'Every hour' },
    ] },
];
const mondayTargetField = (label, placeholder, hint) =>
  ({ type: 'text', key: 'targetValue', label, placeholder, hint });
const mondayVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.name', 'the item name'],
    ['$trigger.status', 'its status column(s)'],
    ['$trigger.group', 'which group it is in'],
    ['$trigger.assignee', 'who it is assigned to'],
    ['$trigger.itemId', 'the item id'],
    ...extra,
  ],
});
const mondayEvent = (id, label, description, icon, extraFields = [], varsExtra = []) => ({
  id, label, description, icon, event: id, accent: '#FF3D57',
  configExtra: { eventType: id },
  fields: [...mondayBaseFields, ...extraFields, mondayVars(varsExtra)],
});

// WooCommerce authenticates with a consumer key/secret pair stored as a
// single vault credential. The poller watches a store's order feed;
// `eventType` (via configExtra) selects the WOO_EVENTS predicate.
const wooBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'WooCommerce Account', credType: 'woocommerce',
    hint: '// connect the store (REST API consumer key + secret)' },
  { type: 'text', key: 'storeUrl', label: 'Store URL', placeholder: 'https://mystore.com',
    hint: '// your WordPress site URL (no trailing slash needed)' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5',
    options: [
      { value: '1', label: 'Every minute' },
      { value: '5', label: 'Every 5 minutes' },
      { value: '15', label: 'Every 15 minutes' },
      { value: '60', label: 'Every hour' },
    ] },
];
const wooTargetField = (label, placeholder, hint) =>
  ({ type: 'text', key: 'targetValue', label, placeholder, hint });
const wooVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.orderNumber', 'the order number'],
    ['$trigger.status', 'order status (processing/completed/…)'],
    ['$trigger.total', 'order total'],
    ['$trigger.email', 'the buyer email'],
    ['$trigger.customerName', 'the buyer name'],
    ['$trigger.paymentMethod', 'how they paid'],
    ...extra,
  ],
});
const wooEvent = (id, label, description, icon, extraFields = [], varsExtra = []) => ({
  id, label, description, icon, event: id, accent: '#96588A',
  configExtra: { eventType: id },
  fields: [...wooBaseFields, ...extraFields, wooVars(varsExtra)],
});

// Shopify authenticates with an Admin API access token (vault credential).
// The poller watches a shop's order feed; `eventType` (via configExtra)
// selects the SHOPIFY_EVENTS predicate over each order.
const shopifyBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'Shopify Account', credType: 'shopify',
    hint: '// connect the store (Admin API access token or OAuth)' },
  { type: 'text', key: 'shop', label: 'Store Domain', placeholder: 'mystore.myshopify.com',
    hint: '// your *.myshopify.com domain' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5',
    options: [
      { value: '1', label: 'Every minute' },
      { value: '5', label: 'Every 5 minutes' },
      { value: '15', label: 'Every 15 minutes' },
      { value: '60', label: 'Every hour' },
    ] },
];
const shopifyTargetField = (label, placeholder, hint) =>
  ({ type: 'text', key: 'targetValue', label, placeholder, hint });
const shopifyVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.orderName', 'the order number (e.g. #1042)'],
    ['$trigger.email', 'the buyer email'],
    ['$trigger.totalPrice', 'order total'],
    ['$trigger.financialStatus', 'paid / pending / refunded'],
    ['$trigger.fulfillmentStatus', 'fulfilled / partial / unfulfilled'],
    ['$trigger.url', 'a link to the order status page'],
    ...extra,
  ],
});
const shopifyEvent = (id, label, description, icon, extraFields = [], varsExtra = []) => ({
  id, label, description, icon, event: id, accent: '#95BF47',
  configExtra: { eventType: id },
  fields: [...shopifyBaseFields, ...extraFields, shopifyVars(varsExtra)],
});

// Sentry authenticates with a Personal Auth Token (vault credential). The
// poller watches an org's (optionally one project's) unresolved issue feed;
// `eventType` (via configExtra) selects the SENTRY_EVENTS predicate.
const sentryBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'Sentry Account', credType: 'sentry',
    hint: '// paste a Sentry Personal Auth Token with issues:read scope' },
  { type: 'text', key: 'organization', label: 'Organization Slug', placeholder: 'acme-inc',
    hint: '// your org slug — found in the Sentry URL after /organizations/' },
  { type: 'text', key: 'project', label: 'Project (optional)', placeholder: 'backend-api',
    hint: '// leave blank to watch every project in the org' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5',
    options: [
      { value: '1', label: 'Every minute' },
      { value: '5', label: 'Every 5 minutes' },
      { value: '15', label: 'Every 15 minutes' },
      { value: '60', label: 'Every hour' },
    ] },
];
const sentryTargetField = (label, placeholder, hint) =>
  ({ type: 'text', key: 'targetValue', label, placeholder, hint });
const sentryVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.title', 'the issue title'],
    ['$trigger.level', 'severity (error/warning/fatal/info)'],
    ['$trigger.count', 'how many times it has happened'],
    ['$trigger.userCount', 'how many users it has hit'],
    ['$trigger.project', 'the project slug'],
    ['$trigger.url', 'a link to open the issue'],
    ...extra,
  ],
});
const sentryEvent = (id, label, description, icon, extraFields = [], varsExtra = []) => ({
  id, label, description, icon, event: id, accent: '#362D59',
  configExtra: { eventType: id },
  fields: [...sentryBaseFields, ...extraFields, sentryVars(varsExtra)],
});

const clickupBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'ClickUp Account', credType: 'clickup',
    hint: '// connect the ClickUp account (Personal API token or OAuth)' },
  { type: 'text', key: 'listId', label: 'List ID', placeholder: '901100000000',
    hint: '// the List to watch — open the list and copy the id from its URL' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '5',
    options: [
      { value: '1', label: 'Every minute' },
      { value: '5', label: 'Every 5 minutes' },
      { value: '15', label: 'Every 15 minutes' },
      { value: '60', label: 'Every hour' },
    ] },
];
const clickupTargetField = (label, placeholder, hint) =>
  ({ type: 'text', key: 'targetValue', label, placeholder, hint });
const clickupVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.name', 'the task name'],
    ['$trigger.status', 'its current status'],
    ['$trigger.priority', 'its priority (urgent/high/…)'],
    ['$trigger.assignees', 'who it is assigned to'],
    ['$trigger.url', 'a link to open the task'],
    ['$trigger.dueDate', 'when it is due'],
    ...extra,
  ],
});
const clickupEvent = (id, label, description, icon, extraFields = [], varsExtra = []) => ({
  id, label, description, icon, event: id, accent: '#7B68EE',
  configExtra: { eventType: id },
  fields: [...clickupBaseFields, ...extraFields, clickupVars(varsExtra)],
});

// IMAP authenticates with a vault-stored mailbox password (resolved by
// credentialId at poll time), plus plaintext host/user/mailbox settings.
// `eventType` (via configExtra) selects the IMAP_EVENTS entry in the poller.
const imapBaseFields = [
  { type: 'credential', key: 'credentialId', label: 'Mailbox Password', credType: 'imap',
    hint: '// stored securely in the credential vault — the IMAP login password' },
  { type: 'text', key: 'imapHost', label: 'IMAP Host', placeholder: 'imap.gmail.com',
    hint: '// your mail provider’s IMAP server' },
  { type: 'text', key: 'imapUser', label: 'Email / Username', placeholder: 'you@example.com',
    hint: '// the mailbox login (usually your full email)' },
  { type: 'text', key: 'mailbox', label: 'Folder', placeholder: 'INBOX',
    hint: '// which folder to watch — defaults to INBOX' },
  { type: 'switch-row', key: 'onlyUnread', label: 'Only Unread', default: true,
    hint: '// when on, only unseen messages are considered' },
  { type: 'switch-row', key: 'markRead', label: 'Mark as Read', default: true,
    hint: '// flag matched messages \\Seen after firing' },
  { type: 'select', key: 'pollInterval', label: 'Check Every', default: '*/5 * * * *',
    options: [
      { value: '* * * * *', label: 'Every minute' },
      { value: '*/5 * * * *', label: 'Every 5 minutes' },
      { value: '*/15 * * * *', label: 'Every 15 minutes' },
      { value: '0 * * * *', label: 'Every hour' },
    ] },
];
const imapTargetField = (label, placeholder, hint) =>
  ({ type: 'text', key: 'targetValue', label, placeholder, hint });
const imapVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.email.from', 'the sender address'],
    ['$trigger.email.subject', 'the subject line'],
    ['$trigger.email.text', 'the plain-text body'],
    ['$trigger.email.to', 'the To recipients'],
    ['$trigger.email.attachmentCount', 'how many attachments'],
    ['$trigger.email.date', 'when it was received'],
    ...extra,
  ],
});
const imapEvent = (id, label, description, icon, extraFields = [], varsExtra = []) => ({
  id, label, description, icon, event: id, accent: '#1A8FE3',
  configExtra: { eventType: id },
  fields: [...imapBaseFields, ...extraFields, imapVars(varsExtra)],
});

// VirusTotal reads a raw API key (not OAuth), so it is a password field. The
// user watches one target (a file hash, URL, or IP); the poller re-checks its
// analysis on a schedule. `eventType` (via configExtra) selects the VT_EVENTS entry.
const VT_TYPE_OPTIONS = [
  { value: 'file', label: 'File hash' },
  { value: 'url', label: 'URL' },
  { value: 'ip', label: 'IP address' },
];
const vtBaseFields = [
  { type: 'password', key: 'apiKey', label: 'VirusTotal API Key',
    hint: '// your account → API Key (the public or premium key)' },
  { type: 'select', key: 'scanType', label: 'Target Type', default: 'file', options: VT_TYPE_OPTIONS },
  { type: 'text', key: 'scanTarget', label: 'Target', placeholder: '44d88612fea8a8f36de82e1278abb02f',
    hint: '// the file hash (SHA-256/MD5), full URL, or IP address to watch' },
  { type: 'select', key: 'pollIntervalMinutes', label: 'Check Every', default: '60',
    options: [
      { value: '15', label: 'Every 15 minutes' },
      { value: '30', label: 'Every 30 minutes' },
      { value: '60', label: 'Every hour' },
      { value: '360', label: 'Every 6 hours' },
    ] },
];
const vtTargetField = (label, placeholder, hint) =>
  ({ type: 'text', key: 'targetValue', label, placeholder, hint });
const vtVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.name', 'the analysed file / URL / IP'],
    ['$trigger.malicious', 'how many engines flagged it malicious'],
    ['$trigger.suspicious', 'how many flagged it suspicious'],
    ['$trigger.detectionRate', 'percent of engines flagging it (0–100)'],
    ['$trigger.totalEngines', 'how many engines reported'],
    ['$trigger.lastAnalysisDate', 'when VirusTotal last scanned it'],
    ...extra,
  ],
});
const vtEvent = (id, label, description, icon, extraFields = [], varsExtra = []) => ({
  id, label, description, icon, event: id, accent: '#394EFF',
  configExtra: { eventType: id },
  fields: [...vtBaseFields, ...extraFields, vtVars(varsExtra)],
});

const AIRTABLE_POLL = [
  { value: '* * * * *', label: 'Every minute' },
  { value: '*/5 * * * *', label: 'Every 5 minutes' },
  { value: '*/15 * * * *', label: 'Every 15 minutes' },
  { value: '*/30 * * * *', label: 'Every 30 minutes' },
  { value: '0 * * * *', label: 'Every hour' },
];
const airtableBaseFields = [
  { type: 'password', key: 'apiKey', label: 'Airtable Personal Access Token', placeholder: 'pat…',
    hint: '// create at airtable.com/create/tokens with data.records:read scope on your base' },
  { type: 'text', key: 'baseId', label: 'Base ID', placeholder: 'app…',
    hint: '// the app… id from the base API docs (airtable.com/api)' },
  { type: 'text', key: 'tableId', label: 'Table', placeholder: 'Table name or tbl… id',
    hint: '// the table name exactly as shown, or its tbl… id' },
  { type: 'select', key: 'pollInterval', label: 'Check Every', default: '*/5 * * * *', options: AIRTABLE_POLL },
];
const airtableFieldInput = {
  type: 'text', key: 'filterField', label: 'Field Name', placeholder: 'e.g. Status',
  hint: '// the exact column name in your table',
};
const airtableVars = (extra = []) => ({
  type: 'vars', label: 'Output Variables', rows: [
    ['$trigger.id', 'the record id'],
    ['$trigger.fields', 'all column values on the record'],
    ['$trigger.createdTime', 'when the record was created'],
    ...extra,
  ],
});
// An Airtable event = a record poll + a formulaMode the poller turns into a real
// filterByFormula. triggerOnUpdate switches created-vs-modified watermarking.
const airtableEvent = (id, label, description, icon, configExtra, fields = [], varsExtra = []) => ({
  id, label, description, icon, event: id, accent: '#fcb400',
  configExtra,
  fields: [...airtableBaseFields, ...fields, airtableVars(varsExtra)],
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

  trello: {
    title: 'Trello',
    subtitle: 'Trigger on board activity — cards, members, comments, checklists',
    events: [
      trelloEvent('card_created', 'Card Created', 'A new card is added to the board', Plus),
      trelloEvent('card_moved', 'Card Moved', 'A card is moved from one list to another', ArrowRightCircle,
        [['$trigger.listBefore', 'list it came from'], ['$trigger.listAfter', 'list it moved to']]),
      trelloEvent('card_archived', 'Card Archived', 'A card is archived (sent to the archive)', Archive),
      trelloEvent('card_unarchived', 'Card Unarchived', 'An archived card is restored', RefreshCw),
      trelloEvent('card_renamed', 'Card Renamed', 'A card title is changed', Type),
      trelloEvent('card_due_changed', 'Due Date Changed', 'A card due date is set or changed', Calendar),
      trelloEvent('card_commented', 'Comment Added', 'Someone comments on a card', MessageSquare,
        [['$trigger.comment', 'the comment text']]),
      trelloEvent('member_added', 'Member Added to Card', 'A member is assigned to a card', UserPlus,
        [['$trigger.targetMember', 'who was added']]),
      trelloEvent('member_removed', 'Member Removed', 'A member is unassigned from a card', UserMinus,
        [['$trigger.targetMember', 'who was removed']]),
      trelloEvent('label_added', 'Label Added', 'A label is applied to a card', Tag,
        [['$trigger.label', 'the label name or color']]),
      trelloEvent('attachment_added', 'Attachment Added', 'A file or link is attached to a card', Paperclip,
        [['$trigger.attachmentName', 'attachment name'], ['$trigger.attachmentUrl', 'attachment url']]),
      trelloEvent('checklist_added', 'Checklist Added', 'A checklist is added to a card', ListTodo,
        [['$trigger.checklistName', 'the checklist name']]),
      trelloEvent('checkitem_done', 'Checklist Item Completed', 'A checklist item is marked complete', CheckSquare,
        [['$trigger.checkItem', 'the item that was completed']]),
      trelloEvent('card_copied', 'Card Copied', 'A card is copied', Copy),
      trelloEvent('list_created', 'List Created', 'A new list is added to the board', Layers, [], false),
    ],
  },

  pipedrive: {
    title: 'Pipedrive',
    subtitle: 'Trigger on CRM activity — deals, people, organizations, activities, leads',
    events: [
      pipedriveEvent('deal_created', 'Deal Created', 'A new deal is added to any pipeline', Handshake,
        [['$trigger.title', 'the deal name'], ['$trigger.value', 'deal value'], ['$trigger.stage', 'stage id']]),
      pipedriveEvent('deal_won', 'Deal Won', 'A deal is marked Won', Trophy,
        [['$trigger.title', 'the won deal'], ['$trigger.value', 'amount won'], ['$trigger.wonTime', 'when it was won']]),
      pipedriveEvent('deal_lost', 'Deal Lost', 'A deal is marked Lost', XCircle,
        [['$trigger.title', 'the lost deal'], ['$trigger.lostReason', 'reason it was lost']]),
      pipedriveEvent('deal_high_value', 'Deal Over Value', 'An open deal worth at least your threshold', DollarSign,
        [['$trigger.value', 'the deal value']],
        [{ type: 'text', key: 'minValue', label: 'Minimum Value', default: '10000', placeholder: '10000',
          hint: '// fire only for open deals worth at least this amount (in the deal currency)' }]),
      pipedriveEvent('person_created', 'Person Created', 'A new contact person is added', User,
        [['$trigger.name', 'person name'], ['$trigger.email', 'email'], ['$trigger.orgName', 'their organization']]),
      pipedriveEvent('organization_created', 'Organization Created', 'A new organization is added', Building2,
        [['$trigger.name', 'organization name'], ['$trigger.peopleCount', 'number of people']]),
      pipedriveEvent('activity_created', 'Activity Created', 'A new activity (call, meeting, task) is scheduled', Calendar,
        [['$trigger.subject', 'activity subject'], ['$trigger.type', 'activity type'], ['$trigger.dueDate', 'due date']]),
      pipedriveEvent('activity_done', 'Activity Completed', 'An activity is marked done', CheckCheck,
        [['$trigger.subject', 'the completed activity'], ['$trigger.dealTitle', 'related deal']]),
      pipedriveEvent('activity_overdue', 'Activity Overdue', 'An open activity is past its due date', AlertCircle,
        [['$trigger.subject', 'the overdue activity'], ['$trigger.dueDate', 'when it was due']]),
      pipedriveEvent('lead_created', 'Lead Created', 'A new lead enters the leads inbox', Target,
        [['$trigger.title', 'lead title'], ['$trigger.value', 'lead value']]),
      pipedriveEvent('note_created', 'Note Created', 'A note is added to a deal, person, or org', StickyNote,
        [['$trigger.content', 'the note text'], ['$trigger.userName', 'who wrote it']]),
    ],
  },

  asana: {
    title: 'Asana',
    subtitle: 'Trigger on task activity in a project — created, completed, assigned, due, overdue',
    events: [
      asanaEvent('new_task', 'Task Created', 'A new task is added to the project', Plus,
        [['$trigger.createdAt', 'when it was created']]),
      asanaEvent('task_completed', 'Task Completed', 'A task is marked complete', CheckCircle2,
        [['$trigger.completedAt', 'when it was completed']]),
      asanaEvent('task_assigned', 'Task Assigned', 'A task gets an assignee', UserCheck,
        [['$trigger.assignee', 'who it was assigned to']]),
      asanaEvent('task_unassigned', 'Task Unassigned', 'An open task has no assignee', UserMinus,
        [['$trigger.name', 'the unassigned task']]),
      asanaEvent('due_today', 'Due Today', 'An open task is due today', Calendar,
        [['$trigger.dueOn', 'the due date']]),
      asanaEvent('overdue', 'Task Overdue', 'An open task is past its due date', AlertCircle,
        [['$trigger.dueOn', 'when it was due']]),
      asanaEvent('due_soon', 'Due Soon', 'An open task is due within the next few days', Clock,
        [['$trigger.dueOn', 'the due date']],
        [{ type: 'text', key: 'dueWithinDays', label: 'Within How Many Days', default: '3', placeholder: '3',
          hint: '// fire when an open task is due within this many days from now' }]),
      asanaEvent('no_due_date', 'Missing Due Date', 'An open task has no due date set', CircleDashed,
        [['$trigger.name', 'the task without a due date']]),
      asanaEvent('in_section', 'Task In Section', 'A task lands in a specific section/column', Layers,
        [['$trigger.section', 'the section it is in']],
        [{ type: 'text', key: 'sectionName', label: 'Section Name', placeholder: 'In Progress',
          hint: '// exact name of the board column / list section to watch' }]),
      asanaEvent('has_tag', 'Task Has Tag', 'A task carries a specific tag', Tag,
        [['$trigger.tags', 'all tags on the task']],
        [{ type: 'text', key: 'tagName', label: 'Tag Name', placeholder: 'urgent',
          hint: '// exact name of the Asana tag to watch for' }]),
      asanaEvent('subtask_added', 'Subtask Created', 'A subtask (task with a parent) appears', GitBranch,
        [['$trigger.parentGid', 'the parent task id']]),
    ],
  },

  gmail: {
    title: 'Gmail',
    subtitle: 'Trigger on new emails — by sender, subject, label, attachments, and more',
    events: [
      gmailEvent('any_new', 'Any New Email', 'Any new message arrives in your inbox', Mail,
        'in:inbox'),
      gmailEvent('unread', 'New Unread Email', 'A new unread message arrives', MailOpen,
        'in:inbox is:unread'),
      gmailEvent('from_sender', 'Email From Sender', 'A new email arrives from a specific address', AtSign,
        'in:inbox', [['$trigger.from', 'the sender that matched']],
        [{ type: 'text', key: 'fromEmail', label: 'From Address', placeholder: 'boss@company.com',
          hint: '// only fire for mail from this address (or domain, e.g. @company.com)' }]),
      gmailEvent('subject_match', 'Subject Contains', 'A new email whose subject contains a keyword', Search,
        'in:inbox', [['$trigger.subject', 'the matched subject']],
        [{ type: 'text', key: 'subjectKeyword', label: 'Subject Keyword', placeholder: 'invoice',
          hint: '// only fire when the subject line contains this word or phrase' }]),
      gmailEvent('has_attachment', 'Email With Attachment', 'A new email that carries a file attachment', Paperclip,
        'in:inbox has:attachment', [['$trigger.attachments', 'the attached files']]),
      gmailEvent('in_label', 'Email In Label', 'A new email lands under a specific label', Tag,
        'in:inbox', [['$trigger.labels', 'labels on the message']],
        [{ type: 'text', key: 'labelName', label: 'Label Name', placeholder: 'Clients',
          hint: '// only fire for mail filed under this Gmail label' }]),
      gmailEvent('starred', 'Email Starred', 'A message is starred', Star,
        'is:starred'),
      gmailEvent('important', 'Marked Important', 'Gmail flags a new email as important', Flag,
        'in:inbox is:important'),
      gmailEvent('from_person', 'Direct Email (not list)', 'A new personal email, excluding mailing lists', Inbox,
        'in:inbox -category:promotions -category:social -list:*'),
      gmailEvent('large_email', 'Large Email', 'A new email larger than a size threshold', FileText,
        'in:inbox', [['$trigger.id', 'the message id']],
        [{ type: 'text', key: 'largerThan', label: 'Larger Than', default: '5M', placeholder: '5M',
          hint: '// e.g. 5M for 5 megabytes, 500K for 500 kilobytes' }]),
      gmailEvent('calendar_invite', 'Calendar Invite', 'A new email containing a calendar invitation', CalendarClock,
        'in:inbox filename:ics'),
      gmailEvent('reply_received', 'Reply Received', 'A new reply (Re:) arrives in your inbox', Reply,
        'in:inbox subject:Re:'),
    ],
  },

  outlook: {
    title: 'Outlook',
    subtitle: 'Trigger on Microsoft 365 / Outlook mail — by folder, sender, importance, attachments',
    events: [
      outlookEvent('any_new', 'Any New Email', 'Any new message arrives in your inbox', Mail),
      outlookEvent('unread', 'New Unread Email', 'A new unread message arrives', MailOpen),
      outlookEvent('from_sender', 'Email From Sender', 'A new email from a specific address', AtSign,
        [['$trigger.fromName', 'the sender name']],
        [{ type: 'text', key: 'fromEmail', label: 'From Address', placeholder: 'boss@company.com',
          hint: '// only fire for mail from this exact address' }]),
      outlookEvent('from_domain', 'Email From Domain', 'A new email from anyone at a domain', Globe,
        [['$trigger.from', 'the matched sender']],
        [{ type: 'text', key: 'fromDomain', label: 'From Domain', placeholder: 'company.com',
          hint: '// only fire for mail from any address at this domain' }]),
      outlookEvent('subject_match', 'Subject Contains', 'A new email whose subject contains a keyword', Search,
        [['$trigger.subject', 'the matched subject']],
        [{ type: 'text', key: 'subjectFilter', label: 'Subject Keyword', placeholder: 'invoice',
          hint: '// only fire when the subject line contains this word or phrase' }]),
      outlookEvent('has_attachment', 'Email With Attachment', 'A new email carrying a file attachment', Paperclip,
        [['$trigger.hasAttachments', 'whether it has attachments']]),
      outlookEvent('high_importance', 'Marked High Importance', 'A new email flagged high importance', AlertOctagon,
        [['$trigger.importance', 'the importance level']]),
      outlookEvent('flagged', 'Email Flagged', 'A message gets a follow-up flag', Flag,
        [['$trigger.flagged', 'whether it is flagged']]),
      outlookEvent('sent', 'Email Sent', 'A new message lands in Sent Items', Send),
      outlookEvent('junk', 'Junk Email', 'A new message arrives in the Junk folder', ShieldAlert),
      outlookEvent('archived', 'Email Archived', 'A message moves to the Archive folder', Archive),
      outlookEvent('draft_saved', 'Draft Saved', 'A new draft is saved', FileText),
    ],
  },

  mastodon: {
    title: 'Mastodon',
    subtitle: 'Trigger on social activity — mentions, boosts, follows, and timeline posts',
    events: [
      mastodonEvent('mention', 'Mentioned', 'Someone mentions you in a post', AtSign),
      mastodonEvent('favourite', 'Post Favourited', 'Someone favourites one of your posts', Star),
      mastodonEvent('reblog', 'Post Boosted', 'Someone boosts (reblogs) one of your posts', Repeat),
      mastodonEvent('follow', 'New Follower', 'Someone follows you', UserPlus),
      mastodonEvent('follow_request', 'Follow Request', 'Someone requests to follow you', UserCheck),
      mastodonEvent('poll_ended', 'Poll Ended', 'A poll you voted in or created has ended', Activity),
      mastodonEvent('status_update', 'Post Edited', 'A post you interacted with is edited', Pencil),
      mastodonEvent('home_post', 'Home Timeline Post', 'A new post appears in your home timeline', Inbox),
      mastodonEvent('local_post', 'Local Timeline Post', 'A new post on your instance’s local timeline', Users),
      mastodonEvent('federated_post', 'Federated Post', 'A new post on the public federated timeline', Globe),
      mastodonEvent('hashtag_post', 'Hashtag Post', 'A new public post using a specific hashtag', Hash,
        [['$trigger.tags', 'all hashtags on the post']],
        [{ type: 'text', key: 'hashtag', label: 'Hashtag', placeholder: 'opensource',
          hint: '// watch the public timeline for this hashtag (no # needed)' }]),
      mastodonEvent('bookmark_added', 'Post Bookmarked', 'You bookmark a post', Bookmark),
      mastodonEvent('favourited_post', 'You Favourited', 'You favourite a post', Heart),
    ],
  },

  google_drive: {
    title: 'Google Drive',
    subtitle: 'Trigger on Drive file activity — added, modified, trashed, shared, by type',
    events: [
      gdriveEvent('file_added', 'File Added', 'A new file appears in your Drive', FileText),
      gdriveEvent('file_modified', 'File Modified', 'An existing file is edited', Pencil,
        [['$trigger.modifiedTime', 'when it was last modified']]),
      gdriveEvent('file_trashed', 'File Trashed', 'A file is moved to the trash', Trash2),
      gdriveEvent('folder_added', 'Folder Created', 'A new folder is created', FolderPlus),
      gdriveEvent('shared_with_me', 'Shared With Me', 'A file is shared with you by someone else', Users,
        [['$trigger.owner', 'who shared it']]),
      gdriveEvent('starred', 'File Starred', 'A file gets starred', Star),
      gdriveEvent('doc_added', 'Google Doc Added', 'A new Google Doc is created', FileType),
      gdriveEvent('sheet_added', 'Google Sheet Added', 'A new Google Sheet is created', FileSpreadsheet),
      gdriveEvent('pdf_added', 'PDF Added', 'A new PDF file appears', FileText),
      gdriveEvent('image_added', 'Image Added', 'A new image file appears', Image),
      gdriveEvent('video_added', 'Video Added', 'A new video file appears', Film),
      gdriveEvent('owned_by_me', 'File I Own Changed', 'A change to any file you own', HardDrive),
    ],
  },

  google_calendar: {
    title: 'Google Calendar',
    subtitle: 'Trigger on calendar activity — events starting, created, edited, cancelled or RSVPed',
    events: [
      gcalEvent('event_starting', 'Event Starting', 'An event is about to begin', CalendarClock),
      gcalEvent('all_day_starting', 'All-Day Event Today', "An all-day event's day has begun", Calendar),
      gcalEvent('recurring_starting', 'Recurring Event Starting', 'An instance of a repeating event begins', Repeat,
        [['$trigger.recurringEventId', 'the id of the parent recurring event']]),
      gcalEvent('with_meet_link', 'Meeting With Video Link', 'An event that has a Google Meet / video link is starting', Play,
        [['$trigger.meetLink', 'the video call link']]),
      gcalEvent('with_attendees', 'Event With Guests', 'An event that has invited guests is starting', Users,
        [['$trigger.attendees', 'the list of guest emails']]),
      gcalEvent('location_set', 'Event With Location', 'An event that has a physical location is starting', Globe,
        [['$trigger.location', 'the event location']]),
      gcalEvent('ends_soon', 'Event Ending', 'An event is wrapping up', Clock,
        [], [gcalLeadField, gcalFilterField]),
      gcalEvent('event_created', 'Event Created', 'A brand-new event is added to the calendar', Plus,
        [['$trigger.created', 'when the event was created']], [gcalFilterField]),
      gcalEvent('event_updated', 'Event Updated', 'An existing event is edited', Pencil,
        [['$trigger.updated', 'when the event was last changed']], [gcalFilterField]),
      gcalEvent('event_cancelled', 'Event Cancelled', 'An event is deleted or cancelled', XCircle,
        [['$trigger.status', 'the event status (cancelled)']], [gcalFilterField]),
      gcalEvent('invite_accepted', 'You Accepted An Invite', 'You RSVP "yes" to an event', CheckCircle2,
        [['$trigger.selfResponse', 'your RSVP status']], [gcalFilterField]),
      gcalEvent('invite_declined', 'You Declined An Invite', 'You RSVP "no" to an event', UserMinus,
        [['$trigger.selfResponse', 'your RSVP status']], [gcalFilterField]),
    ],
  },

  onedrive: {
    title: 'OneDrive',
    subtitle: 'Trigger on OneDrive activity — files added, changed, deleted, shared, by type',
    events: [
      onedriveEvent('file_added', 'File Added', 'A new file appears in your OneDrive', FileText),
      onedriveEvent('file_modified', 'File Modified', 'An existing file is edited', Pencil,
        [['$trigger.lastModified', 'when it was last changed']]),
      onedriveEvent('file_deleted', 'File Deleted', 'A file is removed', Trash2),
      onedriveEvent('folder_added', 'Folder Created', 'A new folder is created', FolderPlus),
      onedriveEvent('shared_item', 'Item Shared', 'A file or folder gets shared', Users),
      onedriveEvent('image_added', 'Image Added', 'A new image file appears', Image),
      onedriveEvent('video_added', 'Video Added', 'A new video file appears', Film),
      onedriveEvent('audio_added', 'Audio Added', 'A new audio file appears', Activity),
      onedriveEvent('pdf_added', 'PDF Added', 'A new PDF file appears', FileText),
      onedriveEvent('office_added', 'Office Doc Added', 'A new Word / Excel / PowerPoint file appears', FileSpreadsheet),
      onedriveEvent('large_file', 'Large File Added', 'A file of 10 MB or more is added', HardDrive,
        [['$trigger.size', 'the file size in bytes']]),
      onedriveEvent('any_change', 'Any Change', 'Any add, edit or delete in the watched scope', RefreshCw),
    ],
  },

  youtube: {
    title: 'YouTube',
    subtitle: 'Trigger on channel activity — uploads, shorts, livestreams, comments and more',
    events: [
      youtubeEvent('new_video', 'New Video', 'The channel uploads any new video', Play),
      youtubeEvent('new_short', 'New Short', 'A new video 60 seconds or shorter', Film,
        [['$trigger.durationSec', 'the length in seconds']]),
      youtubeEvent('new_long', 'New Long Video', 'A new video longer than 60 seconds', FileText,
        [['$trigger.durationSec', 'the length in seconds']]),
      youtubeEvent('live_now', 'Went Live', 'The channel starts a live stream', Flame),
      youtubeEvent('upcoming_stream', 'Stream Scheduled', 'An upcoming live stream is announced', Clock),
      youtubeEvent('keyword_video', 'Video Matching Keyword', 'A new video whose title/description matches a keyword', Search,
        [], [{ type: 'text', key: 'searchQuery', label: 'Keyword', placeholder: 'e.g. tutorial',
          hint: '// only fire for videos matching this search term on the channel' }]),
      youtubeEvent('popular_video', 'Video Hits View Count', 'A recent video reaches a view threshold', Eye,
        [['$trigger.viewCount', 'the current view count']],
        [{ type: 'text', key: 'minViews', label: 'Minimum Views', default: '1000', placeholder: '1000',
          hint: '// fire when a recent video has at least this many views' }]),
      youtubeEvent('highly_liked', 'Video Hits Like Count', 'A recent video reaches a like threshold', Heart,
        [['$trigger.likeCount', 'the current like count']],
        [{ type: 'text', key: 'minLikes', label: 'Minimum Likes', default: '100', placeholder: '100',
          hint: '// fire when a recent video has at least this many likes' }]),
      youtubeEvent('new_comment', 'New Comment', 'Someone comments on the channel', MessageSquare,
        [['$trigger.text', 'the comment text'], ['$trigger.author', 'who commented']]),
      youtubeEvent('playlist_update', 'Playlist Updated', 'A video is added to one of the channel playlists', ListTodo),
      youtubeEvent('channel_activity', 'Any Channel Activity', 'Any activity on the channel feed', Activity,
        [['$trigger.type', 'the kind of activity']]),
      youtubeEvent('social_post', 'Community Post', 'The channel publishes a community / bulletin post', Send),
    ],
  },

  sharepoint: {
    title: 'SharePoint',
    subtitle: 'Trigger on SharePoint list items — added, changed, by column value',
    events: [
      sharepointEvent('item_created', 'Item Created', 'A new item is added to the list', Plus),
      sharepointEvent('item_modified', 'Item Modified', 'An existing item is edited', Pencil),
      sharepointEvent('item_deleted', 'Item Deleted', 'An item is removed from the list', Trash2),
      sharepointEvent('column_equals', 'Column Equals…', 'An item where a column matches a value', Sparkle,
        [], [sharepointColumnField,
          { type: 'text', key: 'targetValue', label: 'Equals', placeholder: 'e.g. Active',
            hint: '// fire only when that column equals this exact value' }]),
      sharepointEvent('column_changed_to', 'Column Changes To…', 'An item is edited so a column becomes a value', ArrowRightCircle,
        [], [sharepointColumnField,
          { type: 'text', key: 'targetValue', label: 'Becomes', placeholder: 'e.g. Done',
            hint: '// e.g. Status changes to Done — re-fires when the item is modified to match' }]),
      sharepointEvent('checkbox_checked', 'Checkbox Checked', 'A Yes/No column becomes Yes', CheckSquare,
        [], [{ ...sharepointColumnField, placeholder: 'e.g. Approved', hint: '// the name of a Yes/No column' }]),
      sharepointEvent('field_filled', 'Field Filled In', 'A column that was blank now has a value', Square,
        [], [{ ...sharepointColumnField, placeholder: 'e.g. Owner' }]),
      sharepointEvent('field_cleared', 'Field Cleared', 'A column becomes empty', Circle,
        [], [{ ...sharepointColumnField, placeholder: 'e.g. Assignee' }]),
      sharepointEvent('number_over', 'Number Over Threshold', 'A numeric column reaches at least a value', Hash,
        [], [{ ...sharepointColumnField, placeholder: 'e.g. Amount', hint: '// the name of a number column' },
          { type: 'text', key: 'targetValue', label: 'At Least', default: '100', placeholder: '100',
            hint: '// fire when the column is greater than or equal to this number' }]),
      sharepointEvent('date_today', 'Date Is Today', 'An item whose date column is today', CalendarClock,
        [], [{ ...sharepointColumnField, placeholder: 'e.g. DueDate', hint: '// the name of a date column' }]),
      sharepointEvent('by_author', 'Created By Person', 'A new item created by a specific person', User,
        [['$trigger.createdByName', 'who created it']],
        [{ type: 'text', key: 'targetValue', label: 'Author Email', placeholder: 'name@contoso.com',
          hint: '// fire only for items created by this email' }]),
      sharepointEvent('any_change', 'Any Change', 'Any add or edit on the list', RefreshCw),
    ],
  },

  google_docs: {
    title: 'Google Docs',
    subtitle: 'Trigger on edits — content growth, keywords, headings and more',
    events: [
      docsEvent('doc_edited', 'Document Edited', 'Any new edit / revision is made', Pencil),
      docsEvent('edited_by', 'Edited By…', 'A specific person makes an edit', User,
        [], [{ type: 'text', key: 'targetValue', label: 'Editor Email', placeholder: 'someone@example.com',
          hint: '// fire only when this person edits' }]),
      docsEvent('content_grew', 'Content Grew', 'The document gained words', Plus,
        [], [{ type: 'text', key: 'targetValue', label: 'Min Words Added', placeholder: '1', default: '1',
          hint: '// fire when at least this many words are added' }]),
      docsEvent('content_shrank', 'Content Shrank', 'The document lost words', Minus,
        [], [{ type: 'text', key: 'targetValue', label: 'Min Words Removed', placeholder: '1', default: '1',
          hint: '// fire when at least this many words are removed' }]),
      docsEvent('contains_text', 'Contains Text', 'The document contains your keyword', Search,
        [], [{ type: 'text', key: 'targetValue', label: 'Keyword', placeholder: 'e.g. approved',
          hint: '// fire on any edit while this text is present' }]),
      docsEvent('text_added', 'Text Just Added', 'Your keyword newly appears in the doc', Type,
        [], [{ type: 'text', key: 'targetValue', label: 'Keyword', placeholder: 'e.g. signed',
          hint: '// fire the moment this text first appears' }]),
      docsEvent('text_removed', 'Text Just Removed', 'Your keyword disappears from the doc', Tag,
        [], [{ type: 'text', key: 'targetValue', label: 'Keyword', placeholder: 'e.g. DRAFT',
          hint: '// fire the moment this text is removed' }]),
      docsEvent('over_words', 'Over Word Count', 'The doc reaches a word count', Hash,
        [], [{ type: 'text', key: 'targetValue', label: 'At Or Above', placeholder: '500',
          hint: '// fire while the word count is ≥ this' }]),
      docsEvent('under_words', 'Under Word Count', 'The doc is below a word count', List,
        [], [{ type: 'text', key: 'targetValue', label: 'At Or Below', placeholder: '50',
          hint: '// fire while the word count is ≤ this' }]),
      docsEvent('heading_added', 'Heading Added', 'A new heading / section appears', Bookmark),
      docsEvent('link_added', 'Link Added', 'A new hyperlink is inserted', Globe),
      docsEvent('renamed', 'Document Renamed', 'The document title changes', Sparkle),
    ],
  },

  google_forms: {
    title: 'Google Forms',
    subtitle: 'Trigger on form submissions — and on what people answered',
    events: [
      formsEvent('new_response', 'New Response', 'Someone submits the form', Inbox),
      formsEvent('answer_equals', 'Answer Equals…', 'A question is answered with an exact value', CheckCircle2,
        [], [formsQuestionField, { type: 'text', key: 'targetValue', label: 'Equals', placeholder: 'e.g. Yes',
          hint: '// fire only when that question equals this' }]),
      formsEvent('answer_contains', 'Answer Contains…', 'A question answer contains your text', Search,
        [], [formsQuestionField, { type: 'text', key: 'targetValue', label: 'Contains', placeholder: 'e.g. refund',
          hint: '// fire when the answer text contains this' }]),
      formsEvent('answer_one_of', 'Answer Is One Of…', 'A question answer matches any value in a list', ListTodo,
        [], [formsQuestionField, { type: 'text', key: 'targetValue', label: 'Any Of (comma separated)', placeholder: 'e.g. Gold, Platinum',
          hint: '// fire when the answer is any of these comma-separated values' }]),
      formsEvent('answer_filled', 'Question Answered', 'A specific question was given an answer', Type,
        [], [formsQuestionField]),
      formsEvent('answer_empty', 'Question Left Blank', 'A specific question was skipped', XCircle,
        [], [formsQuestionField]),
      formsEvent('rating_over', 'Rating At Or Above…', 'A numeric / rating answer meets a threshold', Star,
        [], [formsQuestionField, { type: 'text', key: 'targetValue', label: 'At Or Above', placeholder: 'e.g. 4',
          hint: '// fire when the number is ≥ this' }]),
      formsEvent('rating_under', 'Rating At Or Below…', 'A low numeric / rating answer', Minus,
        [], [formsQuestionField, { type: 'text', key: 'targetValue', label: 'At Or Below', placeholder: 'e.g. 2',
          hint: '// fire when the number is ≤ this' }]),
      formsEvent('long_answer', 'Long Answer', 'A text answer over a character length', MessageSquare,
        [], [formsQuestionField, { type: 'text', key: 'targetValue', label: 'Min Characters', placeholder: '100',
          hint: '// fire when the answer is at least this many characters' }]),
      formsEvent('multiple_choices', 'Multiple Selected', 'A checkbox question with several selections', FileText,
        [], [formsQuestionField, { type: 'text', key: 'targetValue', label: 'At Least N Selected', placeholder: '2',
          hint: '// fire when at least this many options were picked' }]),
      formsEvent('has_file', 'File Uploaded', 'The response includes a file upload', Paperclip),
      formsEvent('from_email', 'From Email…', 'A response from a specific respondent email', Mail,
        [], [{ type: 'text', key: 'targetValue', label: 'Respondent Email', placeholder: 'someone@example.com',
          hint: '// requires the form to collect email addresses' }]),
    ],
  },

  google_sheets: {
    title: 'Google Sheets',
    subtitle: 'Trigger on rows added, edited or deleted — and on column values',
    events: [
      sheetsEvent('row_added', 'Row Added', 'A new row appears in the sheet', Plus),
      sheetsEvent('row_updated', 'Row Updated', 'An existing row is edited', Pencil),
      sheetsEvent('row_deleted', 'Row Deleted', 'A row is removed from the sheet', Trash2),
      sheetsEvent('cell_equals', 'Cell Equals…', 'A column matches a value', CheckCircle2,
        [['$trigger.<column>', 'the matched value']],
        [sheetsColumnField, { type: 'text', key: 'targetValue', label: 'Equals Value', placeholder: 'e.g. Done',
          hint: '// fire when the column equals exactly this' }]),
      sheetsEvent('cell_changed_to', 'Cell Changed To…', 'A column just became a value', Sparkle,
        [], [sheetsColumnField, { type: 'text', key: 'targetValue', label: 'New Value', placeholder: 'e.g. Approved',
          hint: '// fire when an edit sets the column to this value' }]),
      sheetsEvent('cell_filled', 'Cell Filled', 'A previously empty column gets a value', Type,
        [], [sheetsColumnField]),
      sheetsEvent('cell_cleared', 'Cell Cleared', 'A column is emptied', XCircle,
        [], [sheetsColumnField]),
      sheetsEvent('contains_text', 'Cell Contains…', 'A column contains your text', Search,
        [], [sheetsColumnField, { type: 'text', key: 'targetValue', label: 'Contains Text', placeholder: 'e.g. urgent',
          hint: '// fire when the column text contains this' }]),
      sheetsEvent('number_over', 'Number Over…', 'A numeric column is at or above a threshold', Hash,
        [], [sheetsColumnField, { type: 'text', key: 'targetValue', label: 'At Or Above', placeholder: 'e.g. 100',
          hint: '// fire when the number is ≥ this' }]),
      sheetsEvent('number_under', 'Number Under…', 'A numeric column is at or below a threshold', Minus,
        [], [sheetsColumnField, { type: 'text', key: 'targetValue', label: 'At Or Below', placeholder: 'e.g. 10',
          hint: '// fire when the number is ≤ this' }]),
      sheetsEvent('checkbox_checked', 'Checkbox Checked', 'A checkbox / yes column becomes true', CheckSquare,
        [], [sheetsColumnField]),
      sheetsEvent('any_change', 'Any Change', 'Any row added, edited or deleted', RefreshCw),
    ],
  },

  calendly: {
    title: 'Calendly',
    subtitle: 'Watch your bookings — scheduled, rescheduled, canceled, starting soon and more',
    events: [
      calendlyEvent('event_scheduled', 'Event Booked', 'Someone schedules a new meeting.', CalendarClock),
      calendlyEvent('event_updated', 'Event Updated', 'Any change to a booked event.', Pencil),
      calendlyEvent('rescheduled', 'Rescheduled', 'A booking moves to a new time.', RefreshCw),
      calendlyEvent('canceled', 'Canceled', 'A booking is canceled.', XCircle),
      calendlyEvent('starting_soon', 'Starting Soon', 'A meeting begins within 15 minutes.', AlertCircle),
      calendlyEvent('upcoming', 'Upcoming', 'An active meeting is still ahead.', Clock),
      calendlyEvent('ended', 'Ended', 'A meeting has just finished.', CheckCircle2),
      calendlyEvent('status_is', 'Status Is', 'The event matches a status you name.', Activity,
        [calendlyTargetField('Status', 'active', '// active or canceled')]),
      calendlyEvent('event_type_is', 'Event Type Is', 'The booking is for a specific event type.', Tag,
        [calendlyTargetField('Event Type', '30 Minute Meeting', '// match the event-type name')]),
      calendlyEvent('location_is', 'Location Is', 'The meeting uses a specific location kind.', Globe,
        [calendlyTargetField('Location', 'zoom', '// e.g. zoom, google_conference, physical')]),
      calendlyEvent('fully_booked', 'Fully Booked', 'A group event reaches its invitee limit.', Users),
      calendlyEvent('name_contains', 'Name Contains', 'The event-type name includes your text.', Search,
        [calendlyTargetField('Text', 'demo', '// match part of the event name')]),
    ],
  },

  intercom: {
    title: 'Intercom',
    subtitle: 'Watch conversations — created, closed, reopened, assigned, priority and more',
    events: [
      intercomEvent('conversation_created', 'Conversation Started', 'A new conversation opens.', Plus),
      intercomEvent('conversation_updated', 'Conversation Updated', 'Any change to a conversation.', Pencil),
      intercomEvent('reopened', 'Reopened', 'A closed conversation is reopened.', RefreshCw),
      intercomEvent('closed', 'Closed', 'A conversation is closed.', XCircle),
      intercomEvent('snoozed', 'Snoozed', 'A conversation is snoozed for later.', Clock),
      intercomEvent('priority_set', 'Marked Priority', 'A conversation is flagged as priority.', Flag),
      intercomEvent('assigned', 'Assigned', 'A conversation is assigned (optionally to one teammate).', UserCheck,
        [intercomTargetField('Teammate ID (optional)', '123456', '// leave blank for anyone — or an admin id')]),
      intercomEvent('unassigned', 'Unassigned', 'An open conversation has no owner.', UserMinus),
      intercomEvent('waiting', 'Waiting on You', 'An open conversation is awaiting a reply.', AlertCircle),
      intercomEvent('has_tag', 'Has Tag', 'A conversation carries a specific tag.', Tag,
        [intercomTargetField('Tag', 'billing', '// match a conversation tag')]),
      intercomEvent('from_source', 'From Channel', 'A conversation came from a specific channel.', Inbox,
        [intercomTargetField('Channel', 'email', '// e.g. email, conversation, chat')]),
      intercomEvent('subject_contains', 'Subject Contains', 'The conversation subject includes your text.', Search,
        [intercomTargetField('Text', 'refund', '// match part of the subject')]),
    ],
  },

  zendesk: {
    title: 'Zendesk',
    subtitle: 'Watch your tickets — created, status moves, priority, assignees and more',
    events: [
      zendeskEvent('ticket_created', 'Ticket Created', 'A new ticket is opened.', Plus),
      zendeskEvent('ticket_updated', 'Ticket Updated', 'Any change to an existing ticket.', Pencil),
      zendeskEvent('status_changed', 'Status Changed', 'A ticket moves to a different status.', ArrowRightCircle),
      zendeskEvent('status_is', 'Status Is', 'A ticket reaches one specific status.', Flag,
        [zendeskTargetField('Status', 'open', '// new, open, pending, hold, solved or closed')]),
      zendeskEvent('solved', 'Solved', 'A ticket is marked solved.', CheckCircle2),
      zendeskEvent('pending', 'Pending', 'A ticket is waiting on the requester.', PauseCircle),
      zendeskEvent('priority_is', 'Priority Is', 'A ticket has a specific priority.', Gauge,
        [zendeskTargetField('Priority', 'high', '// low, normal, high or urgent')]),
      zendeskEvent('urgent', 'Urgent', 'A ticket is set to urgent priority.', Flame),
      zendeskEvent('assigned', 'Assigned', 'A ticket is assigned (optionally to one agent).', UserCheck,
        [zendeskTargetField('Agent ID (optional)', '123456', '// leave blank for anyone — or an agent id')]),
      zendeskEvent('unassigned', 'Unassigned', 'A ticket has no assignee.', UserMinus),
      zendeskEvent('has_tag', 'Has Tag', 'A ticket carries a specific tag.', Tag,
        [zendeskTargetField('Tag', 'vip', '// match a ticket tag')]),
      zendeskEvent('subject_contains', 'Subject Contains', 'The ticket subject includes your text.', Search,
        [zendeskTargetField('Text', 'refund', '// match part of the subject')]),
    ],
  },

  monday: {
    title: 'monday.com',
    subtitle: 'Watch a board — items created, status moves, groups, assignees and more',
    events: [
      mondayEvent('item_created', 'Item Created', 'A new item appears on the board.', Plus),
      mondayEvent('item_updated', 'Item Updated', 'Any change to an item on the board.', Pencil),
      mondayEvent('status_changed', 'Status Changed', 'An item’s status column changes.', ArrowRightCircle),
      mondayEvent('status_is', 'Status Is', 'An item reaches a specific status label.', Flag,
        [mondayTargetField('Status Label', 'Working on it', '// match a status label (case-insensitive)')]),
      mondayEvent('done', 'Marked Done', 'An item’s status becomes Done / Complete.', CheckCircle2),
      mondayEvent('stuck', 'Stuck', 'An item is marked Stuck.', AlertCircle),
      mondayEvent('moved_group', 'Moved Group', 'An item moves to a different group.', Layers),
      mondayEvent('in_group', 'In Group', 'An item belongs to one specific group.', Bookmark,
        [mondayTargetField('Group Name', 'In Progress', '// match the group title')]),
      mondayEvent('assigned', 'Assigned', 'A person is assigned (optionally a specific one).', UserCheck,
        [mondayTargetField('Person (optional)', 'Jane', '// leave blank for anyone — or a name')]),
      mondayEvent('archived', 'Archived', 'An item is archived.', Archive),
      mondayEvent('name_contains', 'Name Contains', 'The item name includes your text.', Search,
        [mondayTargetField('Text', 'bug', '// match part of the item name')]),
      mondayEvent('column_value_is', 'Column Value Is', 'Any column on the item equals your text.', Hash,
        [mondayTargetField('Value', 'High', '// match any column’s displayed value')]),
    ],
  },

  woocommerce: {
    title: 'WooCommerce',
    subtitle: 'Watch your orders — created, processing, completed, refunded and more',
    events: [
      wooEvent('order_created', 'Order Created', 'A new order is placed.', Plus),
      wooEvent('order_updated', 'Order Updated', 'Any change to an existing order.', Pencil),
      wooEvent('status_changed', 'Status Changed', 'An order moves to a different status.', ArrowRightCircle),
      wooEvent('processing', 'Processing', 'An order enters processing (paid, awaiting fulfilment).', RefreshCw),
      wooEvent('completed', 'Completed', 'An order is marked completed.', CheckCircle2),
      wooEvent('on_hold', 'On Hold', 'An order is placed on hold.', PauseCircle),
      wooEvent('cancelled', 'Cancelled', 'An order is cancelled.', Ban),
      wooEvent('refunded', 'Refunded', 'An order is refunded.', DollarSign),
      wooEvent('failed', 'Failed', 'An order payment fails.', XCircle),
      wooEvent('high_value', 'High-Value Order', 'An order total crosses your threshold.', Gauge,
        [wooTargetField('Minimum Total', '200', '// fire when the order total reaches this amount')]),
      wooEvent('guest_order', 'Guest Order', 'An order placed without a customer account.', User),
      wooEvent('status_is', 'Status Is', 'An order matches one specific status.', Flag,
        [wooTargetField('Status', 'completed', '// e.g. processing, completed, on-hold, refunded')]),
    ],
  },

  shopify: {
    title: 'Shopify',
    subtitle: 'Watch your orders — created, paid, fulfilled, refunded, cancelled and more',
    events: [
      shopifyEvent('order_created', 'Order Created', 'A new order is placed.', Plus),
      shopifyEvent('order_updated', 'Order Updated', 'Any change to an existing order.', Pencil),
      shopifyEvent('order_paid', 'Order Paid', 'An order becomes fully paid.', DollarSign),
      shopifyEvent('order_pending', 'Payment Pending', 'An order is awaiting payment.', Clock),
      shopifyEvent('order_refunded', 'Order Refunded', 'An order is fully or partially refunded.', RefreshCw),
      shopifyEvent('order_cancelled', 'Order Cancelled', 'An order is cancelled.', Ban),
      shopifyEvent('order_fulfilled', 'Order Fulfilled', 'An order is fully fulfilled.', CheckCircle2),
      shopifyEvent('partial_fulfill', 'Partially Fulfilled', 'Some items in an order have shipped.', CircleDashed),
      shopifyEvent('unfulfilled', 'Paid & Unfulfilled', 'A paid order still needs fulfilling.', XCircle),
      shopifyEvent('high_value', 'High-Value Order', 'An order total crosses your threshold.', Gauge,
        [shopifyTargetField('Minimum Total', '200', '// fire when the order total reaches this amount')]),
      shopifyEvent('new_customer', 'First-Time Customer', 'An order from a brand-new customer.', UserPlus),
      shopifyEvent('has_tag', 'Has Tag', 'An order carries a specific tag.', Tag,
        [shopifyTargetField('Tag', 'wholesale', '// match an order tag')]),
    ],
  },

  sentry: {
    title: 'Sentry',
    subtitle: 'Watch your error feed — new issues, regressions, spikes, severity and more',
    events: [
      sentryEvent('new_issue', 'New Issue', 'A brand-new error issue is created.', AlertOctagon),
      sentryEvent('any_issue', 'Any New Event', 'Any unresolved issue receives a fresh occurrence.', Activity),
      sentryEvent('regression', 'Regression', 'A resolved issue comes back (regressed).', RefreshCw),
      sentryEvent('escalating', 'Escalating', 'An issue is escalating in volume.', Flame),
      sentryEvent('level_is', 'Severity Is', 'An issue matches a specific severity level.', Gauge,
        [sentryTargetField('Level', 'error', '// error, warning, fatal or info')]),
      sentryEvent('fatal_error', 'Fatal Error', 'An issue logged at the fatal level.', AlertTriangle),
      sentryEvent('unhandled', 'Unhandled Error', 'An issue from an uncaught exception.', Bug),
      sentryEvent('frequency_over', 'Happened N+ Times', 'An issue crosses an occurrence count.', Flag,
        [sentryTargetField('Count Threshold', '100', '// fire once the event count reaches this number')]),
      sentryEvent('users_over', 'Affecting N+ Users', 'An issue impacts at least N users.', Users,
        [sentryTargetField('User Threshold', '10', '// fire once this many users are affected')]),
      sentryEvent('title_contains', 'Title Contains', 'The issue title includes your text.', Search,
        [sentryTargetField('Text', 'TimeoutError', '// match part of the issue title')]),
      sentryEvent('in_project', 'In Project', 'The issue belongs to one specific project.', Hash,
        [sentryTargetField('Project Slug', 'backend-api', '// match the project slug exactly')]),
      sentryEvent('assigned', 'Assigned', 'An issue is assigned (optionally to a specific person).', UserCheck,
        [sentryTargetField('Assignee (optional)', 'jane@acme.com', '// leave blank for anyone — or a name/email')]),
    ],
  },

  clickup: {
    title: 'ClickUp',
    subtitle: 'Watch a list — tasks created, status moves, assignees, due dates and more',
    events: [
      clickupEvent('task_created', 'Task Created', 'A new task appears in the list.', Plus),
      clickupEvent('task_updated', 'Task Updated', 'Any change to a task in the list.', Pencil),
      clickupEvent('status_changed', 'Status Changed', 'A task moves to a different status.', ArrowRightCircle),
      clickupEvent('moved_to_status', 'Moved to Status', 'A task enters one specific status.', Flag,
        [clickupTargetField('Status Name', 'in progress', '// match the status name (case-insensitive)')]),
      clickupEvent('completed', 'Task Completed', 'A task is marked done / closed.', CheckCircle2),
      clickupEvent('priority_set', 'Priority Is', 'A task has a specific priority.', Flame,
        [clickupTargetField('Priority', 'urgent', '// urgent, high, normal or low')]),
      clickupEvent('assignee_added', 'Assignee Added', 'Someone is assigned (optionally a specific person).', UserPlus,
        [clickupTargetField('Assignee (optional)', 'jane', '// leave blank for anyone — or a username/id')]),
      clickupEvent('unassigned', 'Unassigned', 'A task has no assignee.', UserMinus),
      clickupEvent('due_date_set', 'Due Date Set', 'A due date is added to a task.', Calendar),
      clickupEvent('overdue', 'Overdue', 'A task is past its due date and not done.', Clock),
      clickupEvent('tag_added', 'Has Tag', 'A task carries a specific tag.', Tag,
        [clickupTargetField('Tag', 'bug', '// match a tag name')]),
      clickupEvent('name_contains', 'Name Contains', 'The task name includes your text.', Search,
        [clickupTargetField('Text in Name', 'release', '// case-insensitive contains')]),
    ],
  },

  imap: {
    title: 'Email (IMAP)',
    subtitle: 'Watch any mailbox — by sender, subject, body, attachments and more',
    events: [
      imapEvent('new_email', 'New Email', 'Fire on every new message in the folder.', Inbox),
      imapEvent('from_sender', 'From a Sender', 'Only mail from a specific email address.', User,
        [imapTargetField('Sender Address', 'boss@company.com', '// match the From address exactly')]),
      imapEvent('from_domain', 'From a Domain', 'Only mail from a specific domain.', AtSign,
        [imapTargetField('Domain', 'company.com', '// match the part after the @')]),
      imapEvent('subject_contains', 'Subject Contains', 'The subject line includes your text.', Search,
        [imapTargetField('Text in Subject', 'invoice', '// case-insensitive contains')]),
      imapEvent('subject_is', 'Subject Is Exactly', 'The subject equals your text.', Type,
        [imapTargetField('Exact Subject', 'Weekly Report', '// must match the whole subject')]),
      imapEvent('body_contains', 'Body Contains', 'The message body includes your text.', FileText,
        [imapTargetField('Text in Body', 'unsubscribe', '// searches plain text and HTML')]),
      imapEvent('to_address', 'Sent To Address', 'A specific address is in the To line.', Send,
        [imapTargetField('Recipient Address', 'sales@you.com', '// match an address in To')]),
      imapEvent('cc_address', 'CC’d Address', 'A specific address is on CC.', Users,
        [imapTargetField('CC Address', 'manager@you.com', '// match an address in CC')]),
      imapEvent('has_attachment', 'Has Attachment', 'The message carries at least one attachment.', Paperclip),
      imapEvent('attachment_named', 'Attachment Named', 'An attachment filename matches your text.', FileText,
        [imapTargetField('Filename Contains', '.pdf', '// e.g. an extension or a name fragment')]),
      imapEvent('large_email', 'Large Email', 'The message is over a size threshold.', HardDrive,
        [imapTargetField('Minimum Size (KB)', '500', '// fire when the email is at least this big')]),
      imapEvent('reply_email', 'Is a Reply', 'The subject starts with “Re:”.', Reply),
    ],
  },

  virustotal: {
    title: 'VirusTotal',
    subtitle: 'Watch a file, URL or IP — react to verdicts, detections and rescans',
    events: [
      vtEvent('any_result', 'Any New Result', 'Fire whenever the verdict or scan date changes.', Activity),
      vtEvent('became_malicious', 'Became Malicious', 'Detections went from zero to at least one — a clean target turned bad.', ShieldAlert),
      vtEvent('malicious_over', 'Detections Over', 'At least N engines flag it as malicious.', AlertOctagon,
        [vtTargetField('Minimum Detections', '3', '// fire when malicious count ≥ this')]),
      vtEvent('malicious_under', 'Detections Under', 'No more than N engines flag it (confirmed low-risk).', CheckCircle2,
        [vtTargetField('Maximum Detections', '0', '// fire when malicious count ≤ this')]),
      vtEvent('detection_rate_over', 'Detection Rate Over', 'The share of engines flagging it crosses a percentage.', Gauge,
        [vtTargetField('Minimum Rate (%)', '5', '// fire when detectionRate ≥ this percent')]),
      vtEvent('suspicious_found', 'Suspicious Found', 'At least one engine marks it suspicious.', Eye),
      vtEvent('clean', 'Came Back Clean', 'A completed scan with no malicious or suspicious hits.', Heart),
      vtEvent('engine_count_over', 'Enough Engines Reported', 'Coverage reached — at least N engines reported.', Layers,
        [vtTargetField('Minimum Engines', '40', '// fire when totalEngines ≥ this')]),
      vtEvent('verdict_changed', 'Verdict Changed', 'The malicious count changed in either direction.', RefreshCw),
      vtEvent('harmless_majority', 'Mostly Harmless', 'Half or more of the engines call it harmless.', CheckCircle2),
      vtEvent('undetected_high', 'Many Undetected', 'At least N engines had no detection (low coverage).', AlertTriangle,
        [vtTargetField('Minimum Undetected', '20', '// fire when undetected count ≥ this')]),
      vtEvent('new_analysis', 'Rescanned', 'VirusTotal ran a fresh analysis since last check.', RefreshCw),
    ],
  },

  datadog: {
    title: 'Datadog',
    subtitle: 'Trigger on monitoring events — alerts, recoveries, warnings, hosts and tags',
    events: [
      datadogEvent('any_event', 'Any Event', 'Fire on every new event in your Datadog stream.', Activity),
      datadogEvent('alert_error', 'Alert Triggered', 'A monitor alert fired (error state).', AlertOctagon),
      datadogEvent('alert_warning', 'Warning Raised', 'An event came in at warning level.', AlertTriangle),
      datadogEvent('alert_recovery', 'Alert Recovered', 'A previously-firing monitor went back to OK.', CheckCircle2),
      datadogEvent('alert_info', 'Info Event', 'An informational (non-alert) event arrived.', AlertCircle),
      datadogEvent('high_priority', 'High Priority Event', 'A normal-priority (high-visibility) event arrived.', Flame),
      datadogEvent('low_priority', 'Low Priority Event', 'A low-priority event arrived.', Gauge),
      datadogEvent('from_source', 'From a Source', 'Only events from a specific integration source (e.g. nagios, github).', Globe,
        [datadogTargetField('Source Name', 'nagios', '// match $trigger.source exactly')]),
      datadogEvent('from_host', 'From a Host', 'Only events originating from a specific host.', HardDrive,
        [datadogTargetField('Host Name', 'web-01.prod', '// match the event host exactly')]),
      datadogEvent('has_tag', 'Has a Tag', 'Only events carrying a specific tag.', Tag,
        [datadogTargetField('Tag', 'service:api', '// match one of the event tags exactly')]),
      datadogEvent('title_contains', 'Title Contains', 'The event title includes your text.', Search,
        [datadogTargetField('Text in Title', 'CPU', '// case-insensitive contains on the title')]),
      datadogEvent('text_contains', 'Body Contains', 'The event body includes your text.', FileText,
        [datadogTargetField('Text in Body', 'timeout', '// case-insensitive contains on the body')]),
    ],
  },

  teams: {
    title: 'Microsoft Teams',
    subtitle: 'Trigger on channel messages — replies, mentions, urgent, attachments and more',
    events: [
      teamsEvent('new_message', 'New Message', 'A new top-level message is posted in the channel', MessageSquare),
      teamsEvent('reply_posted', 'Reply Posted', 'Someone replies to a message thread', Reply),
      teamsEvent('mention', 'Someone Mentioned', 'A message that @mentions a person or tag', AtSign,
        [['$trigger.mentionCount', 'how many mentions are in it']]),
      teamsEvent('urgent', 'Urgent Message', 'A message marked Urgent', AlertTriangle,
        [['$trigger.importance', 'the message importance']]),
      teamsEvent('important', 'Important Message', 'A message marked Important or Urgent', Flame,
        [['$trigger.importance', 'the message importance']]),
      teamsEvent('with_attachment', 'Has Attachment', 'A message that includes a file or card', Paperclip,
        [['$trigger.attachmentCount', 'how many attachments']]),
      teamsEvent('with_reaction', 'Got A Reaction', 'A message that received a reaction', Heart,
        [['$trigger.reactionCount', 'how many reactions']]),
      teamsEvent('has_link', 'Contains A Link', 'A message that contains a URL', Globe),
      teamsEvent('announcement', 'Announcement', 'A message posted with a headline / subject', Sparkle,
        [['$trigger.subject', 'the announcement headline']]),
      teamsEvent('from_user', 'From Person…', 'A message from a specific person', User,
        [], [{ type: 'text', key: 'fromUser', label: 'Person Display Name', placeholder: 'e.g. Jane Doe',
          hint: '// fire only for messages from this exact display name' }]),
      teamsEvent('keyword', 'Contains Keyword…', 'A message containing your keyword', Search,
        [], [{ type: 'text', key: 'keywordFilter', label: 'Keyword', placeholder: 'e.g. deploy',
          hint: '// fire only when the message text contains this word' }]),
      teamsEvent('system_event', 'System Event', 'A member joins, leaves or the channel changes', Activity,
        [['$trigger.messageType', 'the system event type']]),
    ],
  },

  airtable: {
    title: 'Airtable',
    subtitle: 'Trigger on new or changed records in an Airtable table',
    events: [
      airtableEvent('record_created', 'Record Created', 'A new record (row) is added to the table', Plus,
        { triggerOnUpdate: false, formulaMode: 'none' }),
      airtableEvent('record_updated', 'Record Updated', 'Any field on a record is changed', Pencil,
        { triggerOnUpdate: true, formulaMode: 'none' }),
      airtableEvent('record_in_view', 'Record Enters View', 'A record appears in a specific Airtable view', Eye,
        { triggerOnUpdate: true, formulaMode: 'none' }, [
          { type: 'text', key: 'viewName', label: 'View Name', placeholder: 'e.g. To Review',
            hint: '// only records visible in this grid/kanban view will fire' },
        ]),
      airtableEvent('field_equals', 'Field Equals…', 'A new record where a field matches a value', Sparkle,
        { triggerOnUpdate: false, formulaMode: 'field_equals' }, [
          airtableFieldInput,
          { type: 'text', key: 'filterValue', label: 'Equals', placeholder: 'e.g. Active',
            hint: '// fire only when that field equals this exact value' },
        ]),
      airtableEvent('field_changed_to', 'Field Changes To…', 'A record is updated so a field becomes a value', ArrowRightCircle,
        { triggerOnUpdate: true, formulaMode: 'field_changed_to' }, [
          airtableFieldInput,
          { type: 'text', key: 'filterValue', label: 'Becomes', placeholder: 'e.g. Done',
            hint: '// e.g. Status changes to Done — re-fires whenever the record is modified to match' },
        ]),
      airtableEvent('checkbox_checked', 'Checkbox Checked', 'A checkbox field becomes checked', CheckSquare,
        { triggerOnUpdate: true, formulaMode: 'checkbox_checked' }, [
          { ...airtableFieldInput, placeholder: 'e.g. Approved', hint: '// the name of a checkbox column' },
        ]),
      airtableEvent('field_not_empty', 'Field Filled In', 'A field that was blank now has a value', Square,
        { triggerOnUpdate: true, formulaMode: 'field_not_empty' }, [
          { ...airtableFieldInput, placeholder: 'e.g. Owner' },
        ]),
      airtableEvent('field_empty', 'Field Cleared', 'A field becomes empty', Circle,
        { triggerOnUpdate: true, formulaMode: 'field_empty' }, [
          { ...airtableFieldInput, placeholder: 'e.g. Assignee' },
        ]),
      airtableEvent('number_over', 'Number Over Threshold', 'A numeric field reaches at least a value', Hash,
        { triggerOnUpdate: true, formulaMode: 'number_over' }, [
          { ...airtableFieldInput, placeholder: 'e.g. Amount', hint: '// the name of a number/currency column' },
          { type: 'text', key: 'filterValue', label: 'At Least', default: '100', placeholder: '100',
            hint: '// fire when the field is greater than or equal to this number' },
        ]),
      airtableEvent('date_today', 'Date Is Today', 'A record whose date field is today (e.g. due today)', CalendarClock,
        { triggerOnUpdate: true, formulaMode: 'date_today' }, [
          { ...airtableFieldInput, placeholder: 'e.g. Due Date', hint: '// the name of a date column' },
        ]),
      airtableEvent('raw_formula', 'Custom Formula', 'Fire on records matching your own Airtable formula', Code,
        { triggerOnUpdate: true, formulaMode: 'raw' }, [
          { type: 'textarea', key: 'filterFormula', label: 'filterByFormula', placeholder: "AND({Status}='Open', {Priority}='High')",
            hint: '// a raw Airtable formula — same syntax as filterByFormula in the API' },
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
