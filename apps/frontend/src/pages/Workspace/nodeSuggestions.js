const NEXT_STEPS = {
  // Triggers
  manual:           [{ type: 'http_request', label: 'HTTP Request' }, { type: 'set_fields', label: 'Set Fields' }, { type: 'ai_transform', label: 'AI Transform' }],
  webhook:          [{ type: 'filter', label: 'Filter' }, { type: 'ai_classify', label: 'AI Classify' }, { type: 'set_fields', label: 'Set Fields' }],
  cron_trigger:     [{ type: 'http_request', label: 'HTTP Request' }, { type: 'web_scraper', label: 'Web Scraper' }, { type: 'web_search', label: 'Web Search' }],
  gmail_trigger:    [{ type: 'ai_classify', label: 'AI Classify' }, { type: 'filter', label: 'Filter' }, { type: 'ai_transform', label: 'AI Transform' }],
  imap_trigger:     [{ type: 'ai_classify', label: 'AI Classify' }, { type: 'filter', label: 'Filter' }, { type: 'ai_transform', label: 'AI Transform' }],
  slack_trigger:    [{ type: 'filter', label: 'Filter' }, { type: 'ai_classify', label: 'AI Classify' }, { type: 'openai', label: 'OpenAI' }],
  discord_trigger:  [{ type: 'filter', label: 'Filter' }, { type: 'ai_classify', label: 'AI Classify' }, { type: 'openai', label: 'OpenAI' }],
  telegram_trigger: [{ type: 'ai_transform', label: 'AI Transform' }, { type: 'filter', label: 'Filter' }, { type: 'openai', label: 'OpenAI' }],
  rss_trigger:      [{ type: 'ai_extract', label: 'AI Extract' }, { type: 'filter', label: 'Filter' }, { type: 'ai_transform', label: 'AI Transform' }],
  github_trigger:   [{ type: 'ai_transform', label: 'AI Transform' }, { type: 'filter', label: 'Filter' }, { type: 'slack', label: 'Slack' }],
  stripe_trigger:   [{ type: 'set_fields', label: 'Set Fields' }, { type: 'slack', label: 'Slack' }, { type: 'sendgrid', label: 'Send Email' }],
  shopify_trigger:  [{ type: 'set_fields', label: 'Set Fields' }, { type: 'sendgrid', label: 'Send Email' }, { type: 'slack', label: 'Slack' }],
  form_trigger:     [{ type: 'ai_classify', label: 'AI Classify' }, { type: 'set_fields', label: 'Set Fields' }, { type: 'sendgrid', label: 'Send Email' }],
  linear_trigger:   [{ type: 'slack', label: 'Slack' }],
  notion_trigger:   [{ type: 'set_fields', label: 'Set Fields' }],
  airtable_trigger: [{ type: 'set_fields', label: 'Set Fields' }],
  hubspot_trigger:  [{ type: 'slack', label: 'Slack' }],
  youtube_trigger:  [{ type: 'ai_extract', label: 'AI Extract' }],
  reddit_trigger:   [{ type: 'ai_extract', label: 'AI Extract' }],

  // Data fetching
  http_request:     [{ type: 'ai_extract', label: 'AI Extract' }, { type: 'set_fields', label: 'Set Fields' }, { type: 'filter', label: 'Filter' }],
  web_scraper:      [{ type: 'ai_extract', label: 'AI Extract' }, { type: 'ai_transform', label: 'AI Transform' }, { type: 'set_fields', label: 'Set Fields' }],
  web_search:       [{ type: 'ai_extract', label: 'AI Extract' }, { type: 'ai_transform', label: 'AI Transform' }, { type: 'filter', label: 'Filter' }],

  // AI processing
  ai_classify:      [{ type: 'condition', label: 'Condition' }, { type: 'filter', label: 'Filter' }, { type: 'slack', label: 'Slack' }],
  ai_extract:       [{ type: 'set_fields', label: 'Set Fields' }, { type: 'slack', label: 'Slack' }, { type: 'sendgrid', label: 'Send Email' }],
  ai_transform:     [{ type: 'sendgrid', label: 'Send Email' }, { type: 'slack', label: 'Slack' }, { type: 'notion', label: 'Notion' }],
  openai:           [{ type: 'slack', label: 'Slack' }, { type: 'sendgrid', label: 'Send Email' }, { type: 'notion', label: 'Notion' }],
  anthropic:        [{ type: 'slack', label: 'Slack' }, { type: 'sendgrid', label: 'Send Email' }, { type: 'notion', label: 'Notion' }],
  gemini:           [{ type: 'slack', label: 'Slack' }, { type: 'sendgrid', label: 'Send Email' }, { type: 'notion', label: 'Notion' }],
  deepseek:         [{ type: 'slack', label: 'Slack' }, { type: 'sendgrid', label: 'Send Email' }, { type: 'notion', label: 'Notion' }],

  // Logic / control
  filter:           [{ type: 'set_fields', label: 'Set Fields' }, { type: 'http_request', label: 'HTTP Request' }, { type: 'slack', label: 'Slack' }],
  set_fields:       [{ type: 'http_request', label: 'HTTP Request' }, { type: 'slack', label: 'Slack' }, { type: 'sendgrid', label: 'Send Email' }],
  merge:            [{ type: 'slack', label: 'Slack' }],

  // CRM / DB
  hubspot:          [{ type: 'sendgrid', label: 'Send Email' }, { type: 'slack', label: 'Slack' }],
  salesforce:       [{ type: 'slack', label: 'Slack' }, { type: 'sendgrid', label: 'Send Email' }],
  mongodb:          [{ type: 'set_fields', label: 'Set Fields' }, { type: 'http_request', label: 'HTTP Request' }],
  postgres:         [{ type: 'set_fields', label: 'Set Fields' }, { type: 'http_request', label: 'HTTP Request' }],
  notion:           [{ type: 'slack', label: 'Slack' }],
  airtable:         [{ type: 'slack', label: 'Slack' }],
  sendgrid:         [{ type: 'slack', label: 'Slack' }],
};

const NO_SUGGEST = new Set([
  'condition', 'distributor', 'loop',
  'slack', 'discord', 'telegram', 'sendgrid', 'gmail',
  'sticky_note',
]);

export function getSuggestions(backendType) {
  return NEXT_STEPS[backendType] || null;
}

// Keep backward compat
export function getSuggestion(backendType) {
  const suggestions = getSuggestions(backendType);
  return suggestions ? suggestions[0] : null;
}

export function shouldSuggest(backendType) {
  return !NO_SUGGEST.has(backendType);
}
