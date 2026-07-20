// Node knowledge base — Brian reads this to fill real configs, not empty {}
// Format: backendType → { label, out (output fields Brian can reference downstream), fields[] }
// fields: { k: config key, t: type, r: required, ex: example, d: short description }

export const NODE_KB = {

  // ─── TRIGGERS ──────────────────────────────────────────────────────────────
  manual: {
    label: "Manual Trigger",
    out: [],
    fields: [],
  },
  webhook: {
    label: "Webhook",
    out: ["body", "headers", "query", "method"],
    fields: [
      { k: "method", t: "select", r: false, ex: "POST", d: "HTTP method (GET|POST|PUT|PATCH|DELETE)" },
    ],
  },
  chat_trigger: {
    label: "Chat Trigger",
    out: ["message", "sessionId", "userId"],
    fields: [],
  },
  cron_trigger: {
    label: "Schedule / Cron",
    out: ["scheduledAt"],
    fields: [
      { k: "schedule", t: "select", r: true, ex: "0 9 * * 1-5", d: "Cron expression or preset (0 9 * * * = 9am daily)" },
    ],
  },
  rss_trigger: {
    label: "RSS Feed",
    out: ["title", "link", "description", "pubDate", "author"],
    fields: [
      { k: "feedUrl", t: "string", r: true, ex: "https://feeds.bbci.co.uk/news/rss.xml", d: "RSS feed URL to poll" },
      { k: "pollInterval", t: "number", r: false, ex: 15, d: "Check every N minutes" },
    ],
  },
  gmail_trigger: {
    label: "Gmail Trigger",
    out: ["from", "to", "subject", "body", "threadId", "messageId", "attachments"],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Gmail OAuth credential" },
      { k: "filter", t: "string", r: false, ex: "is:unread from:boss@company.com", d: "Gmail search filter" },
      { k: "pollInterval", t: "number", r: false, ex: 5, d: "Check every N minutes" },
    ],
  },
  imap_trigger: {
    label: "Email / IMAP",
    out: ["from", "to", "subject", "body", "attachments"],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "IMAP credential" },
      { k: "folder", t: "string", r: false, ex: "INBOX", d: "Mailbox folder to watch" },
    ],
  },
  slack_trigger: {
    label: "Slack Trigger",
    out: ["text", "user", "channel", "ts", "thread_ts"],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Slack credential" },
      { k: "events", t: "array", r: false, ex: ["message.channels"], d: "Slack event types to subscribe to" },
    ],
  },
  discord_trigger: {
    label: "Discord Trigger",
    out: ["content", "author", "channelId", "guildId"],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Discord Bot Token credential" },
      { k: "events", t: "array", r: false, ex: ["MESSAGE_CREATE"], d: "Gateway events to listen for" },
    ],
  },
  telegram_trigger: {
    label: "Telegram Bot",
    out: ["text", "from", "chat", "message_id"],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Telegram Bot credential" },
    ],
  },
  github_trigger: {
    label: "GitHub Trigger",
    out: ["action", "repository", "sender", "pull_request", "issue", "ref"],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "GitHub credential" },
      { k: "owner", t: "string", r: true, ex: "acmecorp", d: "Repo owner / org" },
      { k: "repo", t: "string", r: true, ex: "my-repo", d: "Repository name" },
      { k: "events", t: "array", r: true, ex: ["push", "pull_request"], d: "GitHub webhook events" },
    ],
  },
  shopify_trigger: {
    label: "Shopify Trigger",
    out: ["id", "email", "total_price", "line_items", "customer"],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Shopify credential" },
      { k: "topic", t: "select", r: true, ex: "orders/create", d: "Shopify webhook topic" },
    ],
  },
  linear_trigger: {
    label: "Linear Trigger",
    out: ["action", "data", "type"],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Linear API credential" },
      { k: "events", t: "array", r: true, ex: ["Issue"], d: "Resource types to watch" },
    ],
  },
  notion_trigger: {
    label: "Notion Trigger",
    out: ["id", "properties", "url", "created_time", "last_edited_time"],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Notion credential" },
      { k: "databaseId", t: "string", r: true, ex: "abc123def456", d: "Notion database ID" },
      { k: "pollInterval", t: "number", r: false, ex: 5, d: "Check every N minutes" },
    ],
  },
  airtable_trigger: {
    label: "Airtable Trigger",
    out: ["id", "fields", "createdTime"],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Airtable credential" },
      { k: "baseId", t: "string", r: true, ex: "appXXXXXXXX", d: "Airtable base ID" },
      { k: "tableId", t: "string", r: true, ex: "tblXXXXXXXX", d: "Airtable table ID or name" },
      { k: "pollInterval", t: "number", r: false, ex: 5, d: "Check every N minutes" },
    ],
  },
  stripe_trigger: {
    label: "Stripe Trigger",
    out: ["id", "type", "data", "amount", "currency", "customer"],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Stripe credential" },
      { k: "events", t: "array", r: true, ex: ["payment_intent.succeeded"], d: "Stripe event types" },
    ],
  },
  hubspot_trigger: {
    label: "HubSpot Trigger",
    out: ["objectId", "propertyName", "propertyValue", "eventType"],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "HubSpot credential" },
      { k: "objectType", t: "select", r: true, ex: "contact", d: "contact|company|deal" },
      { k: "eventTypes", t: "array", r: true, ex: ["contact.creation"], d: "HubSpot event types" },
    ],
  },
  google_calendar_trigger: {
    label: "Google Calendar Trigger",
    out: ["summary", "start", "end", "organizer", "attendees", "id"],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Google Calendar credential" },
      { k: "calendarId", t: "string", r: false, ex: "primary", d: "Calendar ID (primary for main)" },
    ],
  },
  youtube_trigger: {
    label: "YouTube Trigger",
    out: ["videoId", "title", "description", "channelId", "publishedAt"],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "YouTube credential" },
      { k: "channelId", t: "string", r: true, ex: "UCxxxxxx", d: "YouTube channel ID to watch" },
      { k: "pollInterval", t: "number", r: false, ex: 30, d: "Check every N minutes" },
    ],
  },
  price_alert_trigger: {
    label: "Price Alert",
    out: ["product", "price", "previousPrice", "change", "url"],
    fields: [
      { k: "url", t: "string", r: true, ex: "https://amazon.com/dp/B09XXX", d: "Product URL to monitor" },
      { k: "priceSelector", t: "string", r: false, ex: ".a-price-whole", d: "CSS selector for price element" },
      { k: "threshold", t: "number", r: false, ex: 50, d: "Alert when price drops below this" },
    ],
  },
  form_trigger: {
    label: "Form Trigger",
    out: ["formData", "submittedAt", "ip"],
    fields: [
      { k: "fields", t: "array", r: false, ex: [{ name: "email", type: "email", required: true }], d: "Form field definitions" },
    ],
  },
  db_trigger: {
    label: "Database Trigger",
    out: ["row", "operation", "table"],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Database credential" },
      { k: "table", t: "string", r: true, ex: "users", d: "Table to watch" },
      { k: "operation", t: "select", r: false, ex: "INSERT", d: "INSERT|UPDATE|DELETE|ALL" },
    ],
  },
  reddit_trigger: {
    label: "Reddit Trigger",
    out: ["title", "selftext", "author", "url", "subreddit", "score"],
    fields: [
      { k: "subreddit", t: "string", r: true, ex: "technology", d: "Subreddit to watch (no r/)" },
      { k: "type", t: "select", r: false, ex: "new", d: "hot|new|top|rising" },
    ],
  },

  // ─── CORE ACTIONS ─────────────────────────────────────────────────────────
  http_request: {
    label: "HTTP Request",
    out: ["body", "status", "headers"],
    fields: [
      { k: "method", t: "select", r: true, ex: "POST", d: "GET|POST|PUT|PATCH|DELETE" },
      { k: "url", t: "string", r: true, ex: "https://api.example.com/data", d: "Endpoint URL, supports {{variables}}" },
      { k: "headers", t: "object", r: false, ex: { "Authorization": "Bearer {{config.apiKey}}", "Content-Type": "application/json" }, d: "Request headers" },
      { k: "body", t: "string", r: false, ex: "{{JSON.stringify($json)}}", d: "Request body (JSON string or template)" },
    ],
  },
  code: {
    label: "Code",
    out: ["result"],
    fields: [
      { k: "code", t: "code", r: true, ex: "const data = $input;\nreturn { result: data.name?.toUpperCase() };", d: "JS code. Use $input for previous node data. Return object." },
    ],
  },
  web_scraper: {
    label: "Web Scraper",
    out: ["text", "html", "url", "title", "data"],
    fields: [
      { k: "url", t: "string", r: true, ex: "{{$json.url}}", d: "Page URL to scrape" },
      { k: "selector", t: "string", r: false, ex: ".product-price", d: "CSS selector to extract specific element" },
      { k: "waitFor", t: "string", r: false, ex: ".content-loaded", d: "Wait for this CSS selector before extracting" },
    ],
  },
  data_mapper: {
    label: "Data Mapper",
    out: ["mapped"],
    fields: [
      { k: "mode", t: "select", r: true, ex: "set", d: "set (add/overwrite fields) | rename | delete | filter | merge" },
      { k: "items", t: "array", r: true, ex: [{ key1: "name", key2: "{{$json.firstName}} {{$json.lastName}}" }], d: "Field mappings. key1=target, key2=value/source" },
    ],
  },
  condition: {
    label: "Condition",
    out: [],
    fields: [
      { k: "conditions", t: "array", r: true, ex: [{ operator: "equals", left: "{{$json.plan}}", right: "enterprise" }], d: "Rules: operator, left, right. True branch = 'true' handle, false = 'false' handle" },
      { k: "mode", t: "select", r: false, ex: "and", d: "and (all must pass) | or (any passes)" },
    ],
  },
  loop: {
    label: "Loop",
    out: ["item", "index", "total"],
    fields: [
      { k: "arrayPath", t: "string", r: true, ex: "{{$json.items}}", d: "Array to iterate over" },
      { k: "maxIterations", t: "number", r: false, ex: 1000, d: "Safety cap on iterations" },
    ],
  },
  merge: {
    label: "Merge",
    out: ["merged"],
    fields: [
      { k: "mode", t: "select", r: true, ex: "combine", d: "combine (array) | zip (pair by index) | concat" },
      { k: "key", t: "string", r: false, ex: "merged", d: "Output key name" },
    ],
  },
  filter_array: {
    label: "Filter Array",
    out: ["items", "count"],
    fields: [
      { k: "arrayPath", t: "string", r: true, ex: "{{$json.results}}", d: "Array to filter" },
      { k: "field", t: "string", r: true, ex: "status", d: "Field name to filter on" },
      { k: "operator", t: "select", r: true, ex: "equals", d: "equals|notEquals|contains|greaterThan|lessThan|isEmpty" },
      { k: "value", t: "string", r: false, ex: "active", d: "Value to compare against" },
      { k: "outputKey", t: "string", r: false, ex: "items", d: "Key name for result array" },
    ],
  },
  sort_array: {
    label: "Sort Array",
    out: ["sorted"],
    fields: [
      { k: "arrayPath", t: "string", r: true, ex: "{{$json.items}}", d: "Array to sort" },
      { k: "field", t: "string", r: true, ex: "createdAt", d: "Field to sort by" },
      { k: "direction", t: "select", r: false, ex: "desc", d: "asc|desc" },
    ],
  },
  deduplicate: {
    label: "Deduplicate",
    out: ["items", "duplicates"],
    fields: [
      { k: "arrayPath", t: "string", r: true, ex: "{{$json.items}}", d: "Array to deduplicate" },
      { k: "field", t: "string", r: true, ex: "email", d: "Field to deduplicate on" },
    ],
  },
  delay: {
    label: "Delay",
    out: ["delayed", "resumeAfter"],
    fields: [
      { k: "mode", t: "select", r: false, ex: "duration", d: "duration|until" },
      { k: "amount", t: "number", r: false, ex: 5, d: "Duration amount (mode=duration)" },
      { k: "unit", t: "select", r: false, ex: "minutes", d: "seconds|minutes|hours|days" },
      { k: "until", t: "string", r: false, ex: "2026-07-12T09:00:00Z", d: "ISO datetime (mode=until)" },
    ],
  },
  wait_for_event: {
    label: "Wait for Webhook",
    out: ["body", "headers", "query", "receivedAt"],
    fields: [],
  },
  sub_workflow: {
    label: "Sub-Workflow",
    out: ["result"],
    fields: [
      { k: "workflowId", t: "string", r: true, ex: "", d: "ID of the child workflow to call" },
      { k: "inputData", t: "object", r: false, ex: { payload: "{{$json}}" }, d: "Data passed to sub-workflow" },
    ],
  },
  set_fields: {
    label: "Set Fields",
    out: [],
    fields: [
      { k: "fields", t: "array", r: true, ex: [{ name: "fullName", value: "{{$json.firstName}} {{$json.lastName}}" }], d: "Fields to add or overwrite on the data object" },
    ],
  },
  aggregate: {
    label: "Aggregate",
    out: ["sum", "avg", "min", "max", "count"],
    fields: [
      { k: "arrayPath", t: "string", r: true, ex: "{{$json.orders}}", d: "Array to aggregate" },
      { k: "field", t: "string", r: true, ex: "total", d: "Numeric field to aggregate" },
      { k: "operations", t: "array", r: true, ex: ["sum", "avg"], d: "sum|avg|min|max|count" },
    ],
  },
  template_renderer: {
    label: "Template",
    out: ["rendered"],
    fields: [
      { k: "template", t: "string", r: true, ex: "Hello {{name}}, your order #{{orderId}} is {{status}}.", d: "Handlebars template string" },
      { k: "data", t: "object", r: false, ex: { name: "{{$json.firstName}}", orderId: "{{$json.id}}", status: "{{$json.status}}" }, d: "Data context for template" },
    ],
  },
  csv_parser: {
    label: "CSV Parser",
    out: ["rows", "headers", "count"],
    fields: [
      { k: "csv", t: "string", r: true, ex: "{{$json.fileContent}}", d: "CSV string to parse" },
      { k: "delimiter", t: "string", r: false, ex: ",", d: "Column delimiter" },
      { k: "hasHeader", t: "boolean", r: false, ex: true, d: "First row is header row" },
    ],
  },
  json_validator: {
    label: "JSON Validator",
    out: ["valid", "errors", "data"],
    fields: [
      { k: "input", t: "string", r: true, ex: "{{$json}}", d: "JSON to validate" },
      { k: "schema", t: "object", r: false, ex: { type: "object", required: ["email"] }, d: "JSON Schema to validate against" },
    ],
  },
  text_splitter: {
    label: "Text Splitter",
    out: ["chunks", "count"],
    fields: [
      { k: "text", t: "string", r: true, ex: "{{$json.content}}", d: "Text to split" },
      { k: "chunkSize", t: "number", r: false, ex: 1000, d: "Characters per chunk" },
      { k: "overlap", t: "number", r: false, ex: 100, d: "Overlap characters between chunks" },
    ],
  },
  date_time: {
    label: "Date & Time",
    out: ["formatted", "unix", "iso", "components"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "format", d: "format|parse|add|subtract|diff|now" },
      { k: "date", t: "string", r: false, ex: "{{$json.createdAt}}", d: "Input date (ISO or unix ms)" },
      { k: "format", t: "string", r: false, ex: "YYYY-MM-DD HH:mm", d: "Output format string" },
    ],
  },
  crypto_utils: {
    label: "Crypto / Hash",
    out: ["hash", "encoded", "decoded"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "hash", d: "hash|encode|decode|sign|verify" },
      { k: "algorithm", t: "select", r: false, ex: "sha256", d: "sha256|sha512|md5|base64" },
      { k: "input", t: "string", r: true, ex: "{{$json.password}}", d: "Input string" },
    ],
  },
  qr_code: {
    label: "QR Code",
    out: ["dataUrl", "svg"],
    fields: [
      { k: "text", t: "string", r: true, ex: "{{$json.url}}", d: "Text or URL to encode" },
      { k: "size", t: "number", r: false, ex: 300, d: "Image size in pixels" },
    ],
  },
  pdf_generator: {
    label: "PDF Generator",
    out: ["pdfBase64", "filename"],
    fields: [
      { k: "html", t: "string", r: true, ex: "<h1>Invoice #{{$json.id}}</h1><p>Total: ${{$json.total}}</p>", d: "HTML content to render as PDF" },
      { k: "filename", t: "string", r: false, ex: "invoice-{{$json.id}}.pdf", d: "Output filename" },
    ],
  },
  image_resize: {
    label: "Image Resize",
    out: ["imageBase64", "width", "height", "format"],
    fields: [
      { k: "imageUrl", t: "string", r: true, ex: "{{$json.imageUrl}}", d: "URL of image to process" },
      { k: "width", t: "number", r: false, ex: 800, d: "Target width in pixels" },
      { k: "height", t: "number", r: false, ex: 600, d: "Target height in pixels" },
      { k: "format", t: "select", r: false, ex: "jpeg", d: "jpeg|png|webp" },
    ],
  },
  web_search: {
    label: "Web Search",
    out: ["results", "query", "total"],
    fields: [
      { k: "query", t: "string", r: true, ex: "{{$json.topic}} latest news", d: "Search query" },
      { k: "maxResults", t: "number", r: false, ex: 5, d: "Max results to return" },
    ],
  },

  // ─── AI NODES ─────────────────────────────────────────────────────────────
  ai_agent: {
    label: "AI Agent",
    out: ["response", "toolCalls", "usage"],
    fields: [
      { k: "systemPrompt", t: "string", r: false, ex: "You are a helpful assistant that processes customer requests.", d: "Agent system instructions" },
      { k: "userMessage", t: "string", r: true, ex: "{{$json.message}}", d: "User input to the agent" },
      { k: "model", t: "select", r: false, ex: "claude-sonnet-4-6", d: "claude-sonnet-4-6|claude-opus-4-7|gpt-4o|gpt-4o-mini" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "AI model credential" },
    ],
  },
  ai_classify: {
    label: "AI Classify",
    out: ["category", "confidence", "categories"],
    fields: [
      { k: "text", t: "string", r: true, ex: "{{$json.message}}", d: "Text to classify" },
      { k: "categories", t: "string", r: true, ex: "billing, technical, general", d: "Comma-separated category list" },
      { k: "context", t: "string", r: false, ex: "Customer support ticket classification", d: "Context to improve accuracy" },
      { k: "model", t: "select", r: false, ex: "gpt-4o-mini", d: "AI model to use" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "AI credential" },
    ],
  },
  ai_extract: {
    label: "AI Extract",
    out: ["extracted"],
    fields: [
      { k: "text", t: "string", r: true, ex: "{{$json.emailBody}}", d: "Text to extract from" },
      { k: "fields", t: "string", r: true, ex: "name, company, phone, date", d: "Comma-separated fields to extract" },
      { k: "context", t: "string", r: false, ex: "Sales lead email", d: "What the text represents" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "AI credential" },
    ],
  },
  ai_transform: {
    label: "AI Transform",
    out: ["result"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "summarize", d: "summarize|translate|rewrite|extract|custom" },
      { k: "text", t: "string", r: true, ex: "{{$json.content}}", d: "Input text" },
      { k: "customPrompt", t: "string", r: false, ex: "Rewrite this as a formal business email:", d: "Custom instruction (when operation=custom)" },
      { k: "language", t: "string", r: false, ex: "Spanish", d: "Target language (for translate operation)" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "AI credential" },
    ],
  },
  ai_decision: {
    label: "AI Decision",
    out: ["decision", "reasoning", "confidence"],
    fields: [
      { k: "question", t: "string", r: true, ex: "Should this {{$json.amount}} refund be approved based on: {{$json.reason}}?", d: "Decision question" },
      { k: "options", t: "string", r: true, ex: "approve, reject, escalate", d: "Comma-separated decision options" },
      { k: "criteria", t: "string", r: false, ex: "Approve refunds under $50 automatically. Escalate amounts over $500.", d: "Decision criteria and rules" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "AI credential" },
    ],
  },
  email_parser: {
    label: "Email Parser",
    out: ["from", "to", "subject", "body", "links", "attachments"],
    fields: [
      { k: "emailContent", t: "string", r: true, ex: "{{$json.raw}}", d: "Raw email content to parse" },
    ],
  },

  // ─── AI MODEL NODES ───────────────────────────────────────────────────────
  anthropic: {
    label: "Anthropic Claude",
    out: ["content", "usage", "model"],
    fields: [
      { k: "model", t: "select", r: true, ex: "claude-sonnet-4-6", d: "claude-sonnet-4-6|claude-opus-4-7|claude-haiku-4-5-20251001" },
      { k: "systemPrompt", t: "string", r: false, ex: "You are a helpful assistant.", d: "System instructions" },
      { k: "userMessage", t: "string", r: true, ex: "{{$json.prompt}}", d: "User message" },
      { k: "maxTokens", t: "number", r: false, ex: 1024, d: "Max output tokens" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Anthropic API key credential" },
    ],
  },
  openai: {
    label: "OpenAI",
    out: ["content", "usage", "model"],
    fields: [
      { k: "model", t: "select", r: true, ex: "gpt-4o-mini", d: "gpt-4o|gpt-4o-mini|gpt-4-turbo|o1-mini" },
      { k: "systemPrompt", t: "string", r: false, ex: "You are a helpful assistant.", d: "System instructions" },
      { k: "userMessage", t: "string", r: true, ex: "{{$json.prompt}}", d: "User message" },
      { k: "maxTokens", t: "number", r: false, ex: 1024, d: "Max output tokens" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "OpenAI API key credential" },
    ],
  },
  gemini: {
    label: "Google Gemini",
    out: ["content", "usage"],
    fields: [
      { k: "model", t: "select", r: true, ex: "gemini-2.0-flash", d: "gemini-2.0-flash|gemini-1.5-pro|gemini-1.5-flash" },
      { k: "systemPrompt", t: "string", r: false, ex: "You are a helpful assistant.", d: "System instructions" },
      { k: "userMessage", t: "string", r: true, ex: "{{$json.prompt}}", d: "User message" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Google AI credential" },
    ],
  },
  groq: {
    label: "Groq",
    out: ["content", "usage"],
    fields: [
      { k: "model", t: "select", r: true, ex: "llama-3.3-70b-versatile", d: "llama-3.3-70b-versatile|mixtral-8x7b" },
      { k: "userMessage", t: "string", r: true, ex: "{{$json.prompt}}", d: "User message" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Groq API key credential" },
    ],
  },
  perplexity: {
    label: "Perplexity",
    out: ["content", "citations"],
    fields: [
      { k: "query", t: "string", r: true, ex: "{{$json.question}}", d: "Question to search and answer" },
      { k: "model", t: "select", r: false, ex: "llama-3.1-sonar-small-128k-online", d: "Perplexity model" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Perplexity API key credential" },
    ],
  },

  // ─── AI AGENT SATELLITE NODES ────────────────────────────────────────────
  // These nodes ONLY exist inside ai_agent hub workflows — never as standalone actions.
  // role → hub slot → canvas position:
  //   "model"       → targetHandle:"llm"          → x:260, y:560
  //   "memory"      → targetHandle:"memory"       → x:540, y:560
  //   "integration" → targetHandle:"integration"  → y:780 (evenly spaced)
  //
  // Config rule: always set credentialId:"" (user fills in). Always set alias to short name.

  agent_anthropic: {
    label: "Claude (Model Slot)",
    role: "model",
    out: [],
    fields: [
      { k: "model", t: "select", r: true, ex: "claude-sonnet-4-6", d: "claude-sonnet-4-6|claude-opus-4-7|claude-haiku-4-5-20251001" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Anthropic API key — user connects after generation" },
    ],
  },
  agent_openai: {
    label: "OpenAI (Model Slot)",
    role: "model",
    out: [],
    fields: [
      { k: "model", t: "select", r: true, ex: "gpt-4o", d: "gpt-4o|gpt-4o-mini|gpt-4-turbo|o1-mini" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "OpenAI API key" },
    ],
  },
  agent_groq: {
    label: "Groq (Model Slot)",
    role: "model",
    out: [],
    fields: [
      { k: "model", t: "select", r: true, ex: "llama-3.3-70b-versatile", d: "llama-3.3-70b-versatile|llama-3.1-8b-instant|mixtral-8x7b" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Groq API key" },
    ],
  },
  agent_gemini: {
    label: "Gemini (Model Slot)",
    role: "model",
    out: [],
    fields: [
      { k: "model", t: "select", r: true, ex: "gemini-2.0-flash", d: "gemini-2.0-flash|gemini-1.5-pro|gemini-1.5-flash" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Google AI Studio API key" },
    ],
  },
  agent_memory_supabase: {
    label: "Supabase RAG Memory",
    role: "memory",
    description: "Vector memory for RAG. Stores document embeddings in Supabase pgvector. Agent retrieves relevant context before every response.",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Supabase service role key credential" },
      { k: "tableName", t: "string", r: true, ex: "documents", d: "Table with pgvector embeddings (needs id, content, embedding columns)" },
    ],
  },
  agent_memory_pinecone: {
    label: "Pinecone RAG Memory",
    role: "memory",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Pinecone API key credential" },
      { k: "indexName", t: "string", r: true, ex: "my-rag-index", d: "Pinecone index name" },
    ],
  },
  agent_integration_gmail: {
    label: "Gmail (Integration Tool)",
    role: "integration",
    description: "Gives AI agent ability to read, search, send, and reply to Gmail emails on behalf of the user.",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Gmail OAuth credential" },
      { k: "alias", t: "string", r: true, ex: "gmail", d: "Short name the agent references in tool calls" },
    ],
  },
  agent_integration_google_sheets: {
    label: "Google Sheets (Integration Tool)",
    role: "integration",
    description: "Agent can read rows, append data, and update cells in any Google Sheet.",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Google OAuth credential" },
      { k: "alias", t: "string", r: true, ex: "sheets", d: "Short name agent uses" },
    ],
  },
  agent_integration_google_calendar: {
    label: "Google Calendar (Integration Tool)",
    role: "integration",
    description: "Agent can create events, check availability, and list upcoming meetings.",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Google OAuth credential" },
      { k: "alias", t: "string", r: true, ex: "calendar", d: "Short name agent uses" },
    ],
  },
  agent_integration_google_drive: {
    label: "Google Drive (Integration Tool)",
    role: "integration",
    description: "Agent can upload, download, search, and organize files in Google Drive.",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Google OAuth credential" },
      { k: "alias", t: "string", r: true, ex: "drive", d: "Short name agent uses" },
    ],
  },
  agent_integration_github: {
    label: "GitHub (Integration Tool)",
    role: "integration",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "GitHub OAuth credential" },
      { k: "alias", t: "string", r: true, ex: "github", d: "Short name agent uses" },
    ],
  },
  agent_integration_slack: {
    label: "Slack (Integration Tool)",
    role: "integration",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Slack OAuth credential" },
      { k: "alias", t: "string", r: true, ex: "slack", d: "Short name agent uses" },
    ],
  },
  agent_integration_notion: {
    label: "Notion (Integration Tool)",
    role: "integration",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Notion OAuth credential" },
      { k: "alias", t: "string", r: true, ex: "notion", d: "Short name agent uses" },
    ],
  },
  agent_integration_hubspot: {
    label: "HubSpot (Integration Tool)",
    role: "integration",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "HubSpot API key credential" },
      { k: "alias", t: "string", r: true, ex: "hubspot", d: "Short name agent uses" },
    ],
  },
  agent_integration_linear: {
    label: "Linear (Integration Tool)",
    role: "integration",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Linear API key credential" },
      { k: "alias", t: "string", r: true, ex: "linear", d: "Short name agent uses" },
    ],
  },
  agent_integration_jira: {
    label: "Jira (Integration Tool)",
    role: "integration",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Jira API key credential" },
      { k: "alias", t: "string", r: true, ex: "jira", d: "Short name agent uses" },
    ],
  },
  agent_integration_airtable: {
    label: "Airtable (Integration Tool)",
    role: "integration",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Airtable API key credential" },
      { k: "alias", t: "string", r: true, ex: "airtable", d: "Short name agent uses" },
    ],
  },
  agent_integration_stripe: {
    label: "Stripe (Integration Tool)",
    role: "integration",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Stripe API key credential" },
      { k: "alias", t: "string", r: true, ex: "stripe", d: "Short name agent uses" },
    ],
  },
  agent_integration_discord: {
    label: "Discord (Integration Tool)",
    role: "integration",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Discord Bot token credential" },
      { k: "alias", t: "string", r: true, ex: "discord", d: "Short name agent uses" },
    ],
  },
  agent_integration_telegram: {
    label: "Telegram (Integration Tool)",
    role: "integration",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Telegram Bot token credential" },
      { k: "alias", t: "string", r: true, ex: "telegram", d: "Short name agent uses" },
    ],
  },
  agent_integration_outlook: {
    label: "Outlook (Integration Tool)",
    role: "integration",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Microsoft OAuth credential" },
      { k: "alias", t: "string", r: true, ex: "outlook", d: "Short name agent uses" },
    ],
  },
  agent_integration_asana: {
    label: "Asana (Integration Tool)",
    role: "integration",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Asana API credential" },
      { k: "alias", t: "string", r: true, ex: "asana", d: "Short name agent uses" },
    ],
  },
  agent_integration_shopify: {
    label: "Shopify (Integration Tool)",
    role: "integration",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Shopify API credential" },
      { k: "alias", t: "string", r: true, ex: "shopify", d: "Short name agent uses" },
    ],
  },
  agent_integration_clickup: {
    label: "ClickUp (Integration Tool)",
    role: "integration",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "ClickUp API credential" },
      { k: "alias", t: "string", r: true, ex: "clickup", d: "Short name agent uses" },
    ],
  },
  agent_integration_twilio: {
    label: "Twilio (Integration Tool)",
    role: "integration",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Twilio credential" },
      { k: "alias", t: "string", r: true, ex: "twilio", d: "Short name agent uses" },
    ],
  },
  agent_integration_mongodb: {
    label: "MongoDB (Integration Tool)",
    role: "integration",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "MongoDB connection string credential" },
      { k: "alias", t: "string", r: true, ex: "mongodb", d: "Short name agent uses" },
    ],
  },
  agent_integration_postgres: {
    label: "PostgreSQL (Integration Tool)",
    role: "integration",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "PostgreSQL connection string credential" },
      { k: "alias", t: "string", r: true, ex: "postgres", d: "Short name agent uses" },
    ],
  },
  agent_integration_redis: {
    label: "Redis (Integration Tool)",
    role: "integration",
    out: [],
    fields: [
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Redis URL credential" },
      { k: "alias", t: "string", r: true, ex: "redis", d: "Short name agent uses" },
    ],
  },

  // ─── COMMUNICATION ────────────────────────────────────────────────────────
  slack: {
    label: "Slack",
    out: ["ts", "channel", "ok"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "postMessage", d: "postMessage|postEphemeral|uploadFile|createChannel" },
      { k: "channel", t: "string", r: true, ex: "#alerts", d: "Channel name or ID" },
      { k: "text", t: "string", r: true, ex: "New alert: {{$json.message}}", d: "Message text (supports Slack mrkdwn)" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Slack credential" },
    ],
  },
  discord: {
    label: "Discord",
    out: ["id", "channelId", "content"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "sendMessage", d: "sendMessage|sendEmbed|sendFile" },
      { k: "channelId", t: "string", r: true, ex: "1234567890", d: "Discord channel ID" },
      { k: "content", t: "string", r: true, ex: "New event: {{$json.title}}", d: "Message content" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Discord Bot credential" },
    ],
  },
  telegram: {
    label: "Telegram",
    out: ["message_id", "chat", "text"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "sendMessage", d: "sendMessage|sendPhoto|sendDocument" },
      { k: "chatId", t: "string", r: true, ex: "{{trigger.data.chat.id}}", d: "Chat ID or @username" },
      { k: "text", t: "string", r: true, ex: "Hello {{trigger.data.from.first_name}}! {{$json.reply}}", d: "Message text" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Telegram Bot credential" },
    ],
  },
  whatsapp: {
    label: "WhatsApp",
    out: ["messageId", "status"],
    fields: [
      { k: "to", t: "string", r: true, ex: "+15551234567", d: "Recipient phone number with country code" },
      { k: "message", t: "string", r: true, ex: "Your order {{$json.orderId}} has been shipped.", d: "Message text" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "WhatsApp/Twilio credential" },
    ],
  },
  twilio: {
    label: "Twilio SMS",
    out: ["sid", "status", "to"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "sendSms", d: "sendSms|makeCall" },
      { k: "to", t: "string", r: true, ex: "{{$json.phoneNumber}}", d: "Recipient phone (+E.164 format)" },
      { k: "body", t: "string", r: true, ex: "Your code is: {{$json.otp}}", d: "SMS message text" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Twilio credential" },
    ],
  },
  sendgrid: {
    label: "SendGrid Email",
    out: ["statusCode", "messageId"],
    fields: [
      { k: "to", t: "string", r: true, ex: "{{$json.email}}", d: "Recipient email" },
      { k: "from", t: "string", r: true, ex: "noreply@company.com", d: "Sender email (must be verified in SendGrid)" },
      { k: "subject", t: "string", r: true, ex: "Welcome to {{$json.company}}!", d: "Email subject" },
      { k: "html", t: "string", r: true, ex: "<h1>Hello {{$json.name}}</h1><p>Thanks for signing up.</p>", d: "HTML email body" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "SendGrid API key credential" },
    ],
  },
  gmail: {
    label: "Gmail",
    out: ["messageId", "threadId", "labelIds"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "sendEmail", d: "sendEmail|replyToThread|getEmail|searchEmails|addLabel" },
      { k: "to", t: "string", r: true, ex: "{{$json.customerEmail}}", d: "Recipient email address" },
      { k: "subject", t: "string", r: true, ex: "Re: {{$json.subject}}", d: "Email subject" },
      { k: "body", t: "string", r: true, ex: "Hi {{$json.name}},\n\n{{$json.message}}\n\nBest regards", d: "Email body (plain text or HTML)" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Gmail OAuth credential" },
    ],
  },
  resend: {
    label: "Resend Email",
    out: ["id"],
    fields: [
      { k: "from", t: "string", r: true, ex: "Brian <noreply@company.com>", d: "Sender (must be verified domain)" },
      { k: "to", t: "string", r: true, ex: "{{$json.email}}", d: "Recipient email" },
      { k: "subject", t: "string", r: true, ex: "Your {{$json.planName}} is ready", d: "Subject line" },
      { k: "html", t: "string", r: true, ex: "<p>Hello {{$json.name}}, your account is live.</p>", d: "HTML body" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Resend API key credential" },
    ],
  },
  elevenlabs: {
    label: "ElevenLabs TTS",
    out: ["audioBase64", "audioUrl"],
    fields: [
      { k: "text", t: "string", r: true, ex: "{{$json.message}}", d: "Text to convert to speech" },
      { k: "voiceId", t: "string", r: false, ex: "21m00Tcm4TlvDq8ikWAM", d: "ElevenLabs voice ID" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "ElevenLabs API key credential" },
    ],
  },

  // ─── DATA STORES ─────────────────────────────────────────────────────────
  airtable: {
    label: "Airtable",
    out: ["id", "fields", "createdTime"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "createRecord", d: "createRecord|updateRecord|getRecord|listRecords|deleteRecord" },
      { k: "baseId", t: "string", r: true, ex: "appXXXXXXXX", d: "Airtable base ID" },
      { k: "tableId", t: "string", r: true, ex: "Leads", d: "Table name or ID" },
      { k: "fields", t: "object", r: false, ex: { "Name": "{{$json.name}}", "Email": "{{$json.email}}", "Status": "New" }, d: "Record fields (for create/update)" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Airtable credential" },
    ],
  },
  google_sheets: {
    label: "Google Sheets",
    out: ["values", "range", "updatedRows"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "appendRow", d: "appendRow|readRows|updateRow|clearRange" },
      { k: "spreadsheetId", t: "string", r: true, ex: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", d: "Google Sheets doc ID (from URL)" },
      { k: "range", t: "string", r: true, ex: "Sheet1!A:Z", d: "A1 notation range" },
      { k: "values", t: "array", r: false, ex: [["{{$json.name}}", "{{$json.email}}", "{{$json.date}}"]], d: "Row data to write (for append/update)" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Google Sheets credential" },
    ],
  },
  notion: {
    label: "Notion",
    out: ["id", "properties", "url"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "createPage", d: "createPage|updatePage|queryDatabase|getPage|appendBlocks" },
      { k: "databaseId", t: "string", r: false, ex: "abc123def456", d: "Notion database ID (for database operations)" },
      { k: "pageId", t: "string", r: false, ex: "{{$json.pageId}}", d: "Page ID (for page operations)" },
      { k: "properties", t: "object", r: false, ex: { "Name": { "title": [{ "text": { "content": "{{$json.title}}" } }] } }, d: "Page properties (Notion API format)" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Notion credential" },
    ],
  },
  mongodb: {
    label: "MongoDB",
    out: ["result", "insertedId", "matchedCount"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "insertOne", d: "insertOne|findOne|findMany|updateOne|deleteOne|aggregate" },
      { k: "collection", t: "string", r: true, ex: "users", d: "Collection name" },
      { k: "filter", t: "object", r: false, ex: { "email": "{{$json.email}}" }, d: "Query filter" },
      { k: "document", t: "object", r: false, ex: { "name": "{{$json.name}}", "email": "{{$json.email}}", "createdAt": "{{new Date().toISOString()}}" }, d: "Document to insert or update body" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "MongoDB credential" },
    ],
  },
  postgres: {
    label: "PostgreSQL",
    out: ["rows", "rowCount"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "query", d: "query|insert|update|delete" },
      { k: "sql", t: "string", r: true, ex: "SELECT * FROM users WHERE email = $1 LIMIT 1", d: "SQL query with $1,$2 params" },
      { k: "params", t: "string", r: false, ex: "[\"{{$json.email}}\"]", d: "JSON array of query params" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "PostgreSQL credential" },
    ],
  },
  redis: {
    label: "Redis",
    out: ["result"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "set", d: "get|set|del|incr|lpush|lrange|hset|hget|expire" },
      { k: "key", t: "string", r: true, ex: "user:{{$json.userId}}:session", d: "Redis key" },
      { k: "value", t: "string", r: false, ex: "{{JSON.stringify($json)}}", d: "Value to store (for set/lpush/hset)" },
      { k: "ttl", t: "number", r: false, ex: 3600, d: "TTL in seconds (for set/expire)" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Redis credential" },
    ],
  },
  firebase: {
    label: "Firebase / Firestore",
    out: ["id", "data"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "setDocument", d: "setDocument|getDocument|queryCollection|updateDocument|deleteDocument" },
      { k: "collection", t: "string", r: true, ex: "users", d: "Firestore collection path" },
      { k: "documentId", t: "string", r: false, ex: "{{$json.userId}}", d: "Document ID (auto-generated if empty)" },
      { k: "data", t: "object", r: false, ex: { "email": "{{$json.email}}", "plan": "free", "createdAt": "{{Date.now()}}" }, d: "Document data" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Firebase credential" },
    ],
  },
  supabase: {
    label: "Supabase",
    out: ["data", "count"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "insert", d: "insert|select|update|delete|upsert" },
      { k: "table", t: "string", r: true, ex: "users", d: "Table name" },
      { k: "data", t: "object", r: false, ex: { "email": "{{$json.email}}", "name": "{{$json.name}}" }, d: "Row data (for insert/update/upsert)" },
      { k: "filter", t: "object", r: false, ex: { "id": "{{$json.id}}" }, d: "Filter for select/update/delete (column=value)" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Supabase credential" },
    ],
  },
  pinecone: {
    label: "Pinecone",
    out: ["matches", "namespace"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "query", d: "query|upsert|delete|fetch" },
      { k: "indexName", t: "string", r: true, ex: "my-embeddings", d: "Pinecone index name" },
      { k: "vector", t: "string", r: false, ex: "{{$json.embedding}}", d: "Query vector (for query operation)" },
      { k: "topK", t: "number", r: false, ex: 10, d: "Number of results to return" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Pinecone credential" },
    ],
  },
  vector_memory: {
    label: "Vector Memory",
    out: ["results", "stored"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "search", d: "search|store|clear" },
      { k: "query", t: "string", r: false, ex: "{{$json.message}}", d: "Search query (for search operation)" },
      { k: "content", t: "string", r: false, ex: "{{$json.text}}", d: "Content to store (for store operation)" },
      { k: "topK", t: "number", r: false, ex: 5, d: "Max results" },
      { k: "namespace", t: "string", r: false, ex: "{{$json.sessionId}}", d: "Namespace to isolate memory per user/session" },
    ],
  },

  // ─── PRODUCTIVITY / PM ────────────────────────────────────────────────────
  github: {
    label: "GitHub",
    out: ["number", "url", "id", "title", "state"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "createIssue", d: "createIssue|updateIssue|createPR|addComment|mergePR|getRepo" },
      { k: "owner", t: "string", r: true, ex: "acmecorp", d: "Repository owner" },
      { k: "repo", t: "string", r: true, ex: "backend", d: "Repository name" },
      { k: "title", t: "string", r: false, ex: "Bug: {{$json.errorMessage}}", d: "Issue/PR title" },
      { k: "body", t: "string", r: false, ex: "**Error:**\n```\n{{$json.stack}}\n```", d: "Issue/PR body (markdown)" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "GitHub credential" },
    ],
  },
  linear: {
    label: "Linear",
    out: ["id", "title", "url", "identifier"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "createIssue", d: "createIssue|updateIssue|addComment|getIssue" },
      { k: "teamId", t: "string", r: true, ex: "TEAM_ID", d: "Linear team ID" },
      { k: "title", t: "string", r: true, ex: "{{$json.title}}", d: "Issue title" },
      { k: "description", t: "string", r: false, ex: "{{$json.description}}", d: "Issue description (markdown)" },
      { k: "priority", t: "number", r: false, ex: 2, d: "0=no|1=urgent|2=high|3=medium|4=low" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Linear credential" },
    ],
  },
  hubspot: {
    label: "HubSpot",
    out: ["id", "properties"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "createContact", d: "createContact|updateContact|createDeal|updateDeal|getContact|searchContacts" },
      { k: "objectType", t: "select", r: true, ex: "contacts", d: "contacts|deals|companies|tickets" },
      { k: "properties", t: "object", r: false, ex: { "email": "{{$json.email}}", "firstname": "{{$json.firstName}}", "lastname": "{{$json.lastName}}" }, d: "HubSpot properties to set" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "HubSpot credential" },
    ],
  },
  shopify: {
    label: "Shopify",
    out: ["id", "email", "total_price", "fulfillment_status"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "getOrder", d: "getOrder|updateOrder|createProduct|updateInventory|fulfillOrder" },
      { k: "orderId", t: "string", r: false, ex: "{{trigger.data.id}}", d: "Order ID" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Shopify credential" },
    ],
  },
  stripe: {
    label: "Stripe",
    out: ["id", "amount", "currency", "status", "customer"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "createPaymentIntent", d: "createPaymentIntent|getCustomer|createCustomer|createSubscription|refund" },
      { k: "amount", t: "number", r: false, ex: 2999, d: "Amount in cents (e.g. 2999 = $29.99)" },
      { k: "currency", t: "string", r: false, ex: "usd", d: "3-letter currency code" },
      { k: "customerId", t: "string", r: false, ex: "{{$json.stripeCustomerId}}", d: "Stripe customer ID" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Stripe credential" },
    ],
  },
  zoom: {
    label: "Zoom",
    out: ["id", "join_url", "start_url", "topic"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "createMeeting", d: "createMeeting|getMeeting|listMeetings|deleteMeeting" },
      { k: "topic", t: "string", r: true, ex: "{{$json.title}}", d: "Meeting title" },
      { k: "startTime", t: "string", r: false, ex: "{{$json.startTime}}", d: "ISO 8601 start time" },
      { k: "duration", t: "number", r: false, ex: 60, d: "Duration in minutes" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Zoom credential" },
    ],
  },
  asana: {
    label: "Asana",
    out: ["gid", "name", "completed"],
    fields: [
      { k: "operation", t: "select", r: true, ex: "createTask", d: "createTask|updateTask|addComment|getTask" },
      { k: "projectId", t: "string", r: true, ex: "PROJECT_GID", d: "Asana project GID" },
      { k: "name", t: "string", r: true, ex: "{{$json.title}}", d: "Task name" },
      { k: "notes", t: "string", r: false, ex: "{{$json.description}}", d: "Task description" },
      { k: "dueOn", t: "string", r: false, ex: "{{$json.dueDate}}", d: "Due date (YYYY-MM-DD)" },
      { k: "credentialId", t: "credential", r: true, ex: "", d: "Asana credential" },
    ],
  },
  notify_hub: {
    label: "Notify Hub",
    out: ["sent", "channels"],
    fields: [
      { k: "message", t: "string", r: true, ex: "🚨 Alert: {{$json.message}}", d: "Notification message" },
      { k: "channels", t: "array", r: true, ex: ["slack", "email"], d: "Channels: email|slack|discord|telegram" },
      { k: "subject", t: "string", r: false, ex: "BlinkBox Alert", d: "Subject line (for email channel)" },
    ],
  },
};

// Build a compact text representation for the system prompt
export function buildNodeRef() {
  const lines = [];
  for (const [type, node] of Object.entries(NODE_KB)) {
    const required = node.fields.filter(f => f.r).map(f => `${f.k}(ex:"${JSON.stringify(f.ex).slice(0,40)}")`).join(", ");
    const optional = node.fields.filter(f => !f.r).map(f => f.k).join(", ");
    const out = node.out.length ? `→ ${node.out.slice(0, 5).join(", ")}` : "";
    const roleStr = node.role ? ` [hub-role:${node.role}]` : "";
    lines.push(`${type}${roleStr}: ${required || "(no required fields)"}${optional ? ` | opt:${optional}` : ""} ${out}`);
  }
  return lines.join("\n");
}
