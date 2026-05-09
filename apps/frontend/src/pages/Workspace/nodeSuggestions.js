const NEXT_STEPS = {
  // Triggers
  manual:            { type: 'http_request',  label: 'HTTP Request' },
  webhook:           { type: 'filter',         label: 'Filter' },
  cron_trigger:      { type: 'http_request',  label: 'HTTP Request' },
  gmail_trigger:     { type: 'ai_classify',   label: 'AI Classify' },
  imap_trigger:      { type: 'ai_classify',   label: 'AI Classify' },
  slack_trigger:     { type: 'filter',         label: 'Filter' },
  discord_trigger:   { type: 'filter',         label: 'Filter' },
  telegram_trigger:  { type: 'ai_transform',  label: 'AI Transform' },
  rss_trigger:       { type: 'ai_extract',    label: 'AI Extract' },
  github_trigger:    { type: 'ai_transform',  label: 'AI Transform' },
  stripe_trigger:    { type: 'set_fields',    label: 'Set Fields' },
  shopify_trigger:   { type: 'set_fields',    label: 'Set Fields' },
  linear_trigger:    { type: 'slack',          label: 'Slack' },
  notion_trigger:    { type: 'set_fields',    label: 'Set Fields' },
  airtable_trigger:  { type: 'set_fields',    label: 'Set Fields' },
  hubspot_trigger:   { type: 'slack',          label: 'Slack' },
  form_trigger:      { type: 'ai_classify',   label: 'AI Classify' },
  youtube_trigger:   { type: 'ai_extract',    label: 'AI Extract' },
  reddit_trigger:    { type: 'ai_extract',    label: 'AI Extract' },

  // Data fetching
  http_request:      { type: 'ai_extract',    label: 'AI Extract' },
  web_scraper:       { type: 'ai_extract',    label: 'AI Extract' },
  web_search:        { type: 'ai_extract',    label: 'AI Extract' },

  // AI processing
  ai_classify:       { type: 'condition',     label: 'Condition' },
  ai_extract:        { type: 'set_fields',    label: 'Set Fields' },
  ai_transform:      { type: 'sendgrid',      label: 'Send Email' },
  openai:            { type: 'slack',          label: 'Slack' },
  anthropic:         { type: 'slack',          label: 'Slack' },
  gemini:            { type: 'slack',          label: 'Slack' },
  deepseek:          { type: 'slack',          label: 'Slack' },

  // Logic / control
  filter:            { type: 'set_fields',    label: 'Set Fields' },
  set_fields:        { type: 'http_request',  label: 'HTTP Request' },
  merge:             { type: 'slack',          label: 'Slack' },

  // CRM / DB
  hubspot:           { type: 'sendgrid',      label: 'Send Email' },
  salesforce:        { type: 'slack',          label: 'Slack' },
  mongodb:           { type: 'set_fields',    label: 'Set Fields' },
  postgres:          { type: 'set_fields',    label: 'Set Fields' },
  notion:            { type: 'slack',          label: 'Slack' },
  airtable:          { type: 'slack',          label: 'Slack' },
  sendgrid:          { type: 'slack',          label: 'Slack' },
};

const NO_SUGGEST = new Set([
  'condition', 'success_failed', 'distributor', 'loop',
  'slack', 'discord', 'telegram', 'sendgrid', 'gmail',
  'sticky_note',
]);

export function getSuggestion(backendType) {
  return NEXT_STEPS[backendType] || null;
}

export function shouldSuggest(backendType) {
  return !NO_SUGGEST.has(backendType);
}
