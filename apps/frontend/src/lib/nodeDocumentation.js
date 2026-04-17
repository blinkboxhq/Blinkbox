export const NODE_DOCS = {
  http_request: {
    description: "Make any HTTP/HTTPS request to an external API or endpoint.",
    inputs: [
      { name: "method", type: "string", desc: "HTTP method (GET, POST, PUT, PATCH, DELETE)" },
      { name: "url", type: "string", desc: "Full URL including query params if needed" },
      { name: "headers", type: "object", desc: "Request headers as key-value pairs" },
      { name: "body", type: "any", desc: "Request body — JSON or plain text" },
    ],
    outputs: [
      { name: "status", type: "number", desc: "HTTP response status code" },
      { name: "body", type: "any", desc: "Parsed response body" },
      { name: "headers", type: "object", desc: "Response headers" },
    ],
    example: { method: "POST", url: "https://api.example.com/data", body: { key: "{{trigger.payload.value}}" } },
  },
  ai_agent: {
    description: "Send a prompt to an AI model (GPT-4, Claude, etc.) and get a structured or freeform response.",
    inputs: [
      { name: "prompt", type: "string", desc: "The user prompt — use {{variables}} to inject upstream data" },
      { name: "model", type: "string", desc: "Model ID override (optional)" },
      { name: "systemPrompt", type: "string", desc: "System instructions for the model" },
    ],
    outputs: [
      { name: "response", type: "string", desc: "Model's text response" },
      { name: "tokens", type: "number", desc: "Total tokens consumed" },
    ],
    example: { prompt: "Summarise this in 3 bullet points:\n{{n1.body}}" },
  },
  send_email: {
    description: "Send an email via SMTP or a configured email credential.",
    inputs: [
      { name: "to", type: "string", desc: "Recipient email address" },
      { name: "subject", type: "string", desc: "Email subject line" },
      { name: "body", type: "string", desc: "Email body — HTML or plain text" },
    ],
    outputs: [
      { name: "messageId", type: "string", desc: "Sent message ID from SMTP server" },
    ],
    example: { to: "{{n1.email}}", subject: "Your report is ready", body: "<p>Hello {{n1.name}}</p>" },
  },
  slack: {
    description: "Post a message to a Slack channel or send a DM.",
    inputs: [
      { name: "channel", type: "string", desc: "Channel name or user ID (#general or @username)" },
      { name: "message", type: "string", desc: "Message text — Markdown supported" },
    ],
    outputs: [
      { name: "ts", type: "string", desc: "Slack message timestamp (unique ID)" },
    ],
    example: { channel: "#alerts", message: "New submission: {{n1.body.name}}" },
  },
  web_scraper: {
    description: "Scrape a URL with headless Chrome and extract text, HTML, or specific elements.",
    inputs: [
      { name: "source", type: "string", desc: "URL to scrape" },
      { name: "particularThing", type: "string", desc: "Natural language description of what to extract" },
    ],
    outputs: [
      { name: "content", type: "string", desc: "Extracted text content" },
      { name: "html", type: "string", desc: "Raw HTML of the page" },
    ],
    example: { source: "https://example.com/pricing", particularThing: "Extract all pricing tiers" },
  },
  condition: {
    description: "Branch the workflow based on one or more conditions. True paths continue; false paths stop.",
    inputs: [
      { name: "condition", type: "object", desc: "Condition definition — built using the condition builder" },
    ],
    outputs: [
      { name: "result", type: "boolean", desc: "Whether the condition evaluated to true" },
    ],
    example: {},
  },
  loop: {
    description: "Iterate over an array and run downstream nodes once per item.",
    inputs: [
      { name: "arrayPath", type: "string", desc: "Variable path to the array to iterate (e.g. {{n1.items}})" },
      { name: "maxIterations", type: "number", desc: "Hard limit on iterations (default 1000)" },
    ],
    outputs: [
      { name: "item", type: "any", desc: "Current iteration item" },
      { name: "index", type: "number", desc: "Current iteration index (0-based)" },
      { name: "total", type: "number", desc: "Total number of items" },
    ],
    example: { arrayPath: "{{n1.results}}", maxIterations: 100 },
  },
  data_mapper: {
    description: "Transform, rename, or filter fields in your data payload.",
    inputs: [
      { name: "mode", type: "string", desc: "'set' to add/overwrite keys, 'delete' to remove them" },
      { name: "items", type: "array", desc: "Array of { key1, key2 } mapping pairs" },
    ],
    outputs: [
      { name: "data", type: "object", desc: "The transformed output object" },
    ],
    example: { mode: "set", items: [{ key1: "fullName", key2: "{{n1.firstName}} {{n1.lastName}}" }] },
  },
  code: {
    description: "Run custom JavaScript code with access to all upstream node outputs.",
    inputs: [
      { name: "code", type: "string", desc: "JavaScript code — must call return() with the output" },
    ],
    outputs: [
      { name: "result", type: "any", desc: "The value returned from your code" },
    ],
    example: { code: "return { total: inputs.n1.items.length };" },
  },
  webhook: {
    description: "Receive incoming HTTP requests and trigger the workflow with the request payload.",
    inputs: [],
    outputs: [
      { name: "body", type: "object", desc: "Parsed request body" },
      { name: "headers", type: "object", desc: "Request headers" },
      { name: "query", type: "object", desc: "URL query parameters" },
    ],
    example: {},
  },
};
