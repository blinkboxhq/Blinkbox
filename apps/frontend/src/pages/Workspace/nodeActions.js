// Per-node action list — shown in AddNodeSidebar two-step picker
// Each entry: { name, description, icon?, value? }
//
// App nodes are NOT listed by hand: their actions are derived from the same
// OPERATIONS array their config panel renders, so the picker can never offer
// an action the panel doesn't know how to run.

import { OPERATIONS as ops_telegram } from "@nodes/telegram/ConfigPanel.jsx";
import { OPERATIONS as ops_whatsapp } from "@nodes/whatsapp/ConfigPanel.jsx";
import { OPERATIONS as ops_slack } from "@nodes/slack/ConfigPanel.jsx";
import { OPERATIONS as ops_discord } from "@nodes/discord/ConfigPanel.jsx";
import { OPERATIONS as ops_gmail } from "@nodes/gmail/ConfigPanel.jsx";
import { OPERATIONS as ops_twilio } from "@nodes/twilio/ConfigPanel.jsx";
import { OPERATIONS as ops_sendgrid } from "@nodes/sendgrid/ConfigPanel.jsx";
import { OPERATIONS as ops_airtable } from "@nodes/airtable/ConfigPanel.jsx";
import { OPERATIONS as ops_google_sheets } from "@nodes/google_sheets/ConfigPanel.jsx";
import { OPERATIONS as ops_notion } from "@nodes/notion/ConfigPanel.jsx";
import { OPERATIONS as ops_google_calendar } from "@nodes/google_calendar/ConfigPanel.jsx";
import { OPERATIONS as ops_google_drive } from "@nodes/google_drive/ConfigPanel.jsx";
import { OPERATIONS as ops_jira } from "@nodes/jira/ConfigPanel.jsx";
import { OPERATIONS as ops_linear } from "@nodes/linear/ConfigPanel.jsx";
import { OPERATIONS as ops_stripe } from "@nodes/stripe/ConfigPanel.jsx";
import { OPERATIONS as ops_hubspot } from "@nodes/hubspot/ConfigPanel.jsx";
import { OPERATIONS as ops_shopify } from "@nodes/shopify/ConfigPanel.jsx";
import { OPERATIONS as ops_resend } from "@nodes/resend/ConfigPanel.jsx";
import { OPERATIONS as ops_trello } from "@nodes/trello/ConfigPanel.jsx";
import { OPERATIONS as ops_asana } from "@nodes/asana/ConfigPanel.jsx";
import { OPERATIONS as ops_clickup } from "@nodes/clickup/ConfigPanel.jsx";
import { OPERATIONS as ops_monday } from "@nodes/monday/ConfigPanel.jsx";
import { OPERATIONS as ops_pipedrive } from "@nodes/pipedrive/ConfigPanel.jsx";
import { OPERATIONS as ops_intercom } from "@nodes/intercom/ConfigPanel.jsx";
import { OPERATIONS as ops_woocommerce } from "@nodes/woocommerce/ConfigPanel.jsx";
import { OPERATIONS as ops_typeform } from "@nodes/typeform/ConfigPanel.jsx";
import { OPERATIONS as ops_outlook } from "@nodes/outlook/ConfigPanel.jsx";
import { OPERATIONS as ops_teams } from "@nodes/teams/ConfigPanel.jsx";
import { OPERATIONS as ops_onedrive } from "@nodes/onedrive/ConfigPanel.jsx";
import { OPERATIONS as ops_sharepoint } from "@nodes/sharepoint/ConfigPanel.jsx";
import { OPERATIONS as ops_google_docs } from "@nodes/google_docs/ConfigPanel.jsx";
import { OPERATIONS as ops_google_forms } from "@nodes/google_forms/ConfigPanel.jsx";
import { OPERATIONS as ops_zendesk } from "@nodes/zendesk/ConfigPanel.jsx";
import { OPERATIONS as ops_calendly } from "@nodes/calendly/ConfigPanel.jsx";
import { OPERATIONS as ops_mailchimp } from "@nodes/mailchimp/ConfigPanel.jsx";
import { OPERATIONS as ops_figma } from "@nodes/figma/ConfigPanel.jsx";
import { OPERATIONS as ops_reddit } from "@nodes/reddit/ConfigPanel.jsx";
import { OPERATIONS as ops_instagram } from "@nodes/instagram/ConfigPanel.jsx";
import { OPERATIONS as ops_tiktok } from "@nodes/tiktok/ConfigPanel.jsx";
import { OPERATIONS as ops_linkedin } from "@nodes/linkedin/ConfigPanel.jsx";
import { OPERATIONS as ops_zoom } from "@nodes/zoom/ConfigPanel.jsx";

import { OPERATIONS as ops_postgres } from "@nodes/postgres/ConfigPanel.jsx";
import { OPERATIONS as ops_supabase } from "@nodes/supabase/ConfigPanel.jsx";
import { OPERATIONS as ops_mongodb } from "@nodes/mongodb/ConfigPanel.jsx";
import { OPERATIONS as ops_redis } from "@nodes/redis/ConfigPanel.jsx";
import { OPERATIONS as ops_firebase } from "@nodes/firebase/ConfigPanel.jsx";
import { OPERATIONS as ops_pinecone } from "@nodes/pinecone/ConfigPanel.jsx";

import { OPERATIONS as ops_csv_parser } from "@nodes/csv_parser/ConfigPanel.jsx";
import { OPERATIONS as ops_date_time } from "@nodes/date_time/ConfigPanel.jsx";
import { OPERATIONS as ops_crypto_utils } from "@nodes/crypto_utils/ConfigPanel.jsx";
import { OPERATIONS as ops_text_format } from "@nodes/text_format/ConfigPanel.jsx";
import { OPERATIONS as ops_regex_match } from "@nodes/regex_match/ConfigPanel.jsx";
import { OPERATIONS as ops_json_transform } from "@nodes/json_transform/ConfigPanel.jsx";
import { OPERATIONS as ops_variable_set_get } from "@nodes/variable_set_get/ConfigPanel.jsx";
import { OPERATIONS as ops_data_mapper } from "@nodes/data_mapper/ConfigPanel.jsx";

import {
  MessageSquare, Zap, Braces, Wrench, Eye, Image, ImagePlus, Copy,
  Mic, Languages, Volume2, Layers, ShieldCheck, List, Settings2,
} from "lucide-react";

const APP_OPERATIONS = {
  telegram: ops_telegram,
  whatsapp: ops_whatsapp,
  slack: ops_slack,
  discord: ops_discord,
  gmail: ops_gmail,
  twilio: ops_twilio,
  sendgrid: ops_sendgrid,
  airtable: ops_airtable,
  google_sheets: ops_google_sheets,
  notion: ops_notion,
  google_calendar: ops_google_calendar,
  google_drive: ops_google_drive,
  jira: ops_jira,
  linear: ops_linear,
  stripe: ops_stripe,
  hubspot: ops_hubspot,
  shopify: ops_shopify,
  resend: ops_resend,
  trello: ops_trello,
  asana: ops_asana,
  clickup: ops_clickup,
  monday: ops_monday,
  pipedrive: ops_pipedrive,
  intercom: ops_intercom,
  woocommerce: ops_woocommerce,
  typeform: ops_typeform,
  outlook: ops_outlook,
  teams: ops_teams,
  onedrive: ops_onedrive,
  sharepoint: ops_sharepoint,
  google_docs: ops_google_docs,
  google_forms: ops_google_forms,
  zendesk: ops_zendesk,
  calendly: ops_calendly,
  mailchimp: ops_mailchimp,
  figma: ops_figma,
  reddit: ops_reddit,
  instagram: ops_instagram,
  tiktok: ops_tiktok,
  linkedin: ops_linkedin,
  zoom: ops_zoom,

};

const DB_OPERATIONS = {
  postgres: ops_postgres,
  supabase: ops_supabase,
  mongodb: ops_mongodb,
  redis_node: ops_redis,
  firebase: ops_firebase,
  pinecone: ops_pinecone,
};

const DATA_OPERATIONS = {
  csv_parser: ops_csv_parser,
  date_time: ops_date_time,
  crypto_utils: ops_crypto_utils,
  text_format: ops_text_format,
  regex_match: ops_regex_match,
  json_transform: ops_json_transform,
  variable_set_get: ops_variable_set_get,
  data_mapper: ops_data_mapper,
};

const derive = (source) =>
  Object.fromEntries(
    Object.entries(source).map(([key, ops]) => [
      key,
      ops.map((o) => ({ name: o.label, value: o.value, description: o.group || "", icon: o.icon })),
    ]),
  );

const APP_ACTIONS = derive(APP_OPERATIONS);
const DB_ACTIONS = derive(DB_OPERATIONS);
const DATA_ACTIONS = derive(DATA_OPERATIONS);

// Categories whose nodes pick an action inside the config panel dropdown.
// Anything else with a NODE_ACTIONS entry uses the sidebar's two-step picker.
export const ACTION_PICKER_CATEGORIES = ["ai_models", "apps", "databases", "data"];

// Categories where a node is one node, one job — never an action picker,
// in the sidebar or the panel.
export const NO_ACTION_CATEGORIES = ["logic"];

export const nodeHasActions = (category, key) =>
  !NO_ACTION_CATEGORIES.includes(category) && (NODE_ACTIONS[key]?.length ?? 0) > 0;

const BUILTIN_ACTIONS = {
  // ── AI Models ───────────────────────────────────────────────────────────────
  openai: [
    { name: "Chat Completion", description: "Send a prompt and get a text response from GPT", icon: MessageSquare },
    { name: "Stream Chat", description: "Stream tokens in real-time for faster perceived response", icon: Zap },
    { name: "Structured Output", description: "Force GPT to return JSON matching a schema you define", icon: Braces },
    { name: "Function Calling", description: "Let GPT call your custom functions to fetch data", icon: Wrench },
    { name: "Vision Analysis", description: "Analyze images and answer questions about them", icon: Eye },
    { name: "Generate Image", description: "Create images with DALL·E 3 from a text prompt", icon: Image },
    { name: "Edit Image", description: "Edit an image with a prompt and an optional mask", icon: ImagePlus },
    { name: "Image Variation", description: "Generate variations of an existing image", icon: Copy },
    { name: "Transcribe Audio", description: "Convert audio or video to text using Whisper", icon: Mic },
    { name: "Translate Audio", description: "Transcribe non-English audio straight into English", icon: Languages },
    { name: "Text to Speech", description: "Convert text to natural-sounding audio with TTS-1", icon: Volume2 },
    { name: "Create Embedding", description: "Generate a vector embedding for text content", icon: Layers },
    { name: "Moderate Content", description: "Check text for policy violations using the moderation API", icon: ShieldCheck },
    { name: "List Models", description: "Fetch the live list of models available to your key", icon: List },
    { name: "Fine-tune Model", description: "Start a fine-tuning job on a custom dataset", icon: Settings2 },
  ],
  anthropic: [
    { name: "Chat Completion", description: "Send a prompt and get a response from Claude" },
    { name: "Multi-turn Conversation", description: "Maintain dialogue context across a messages array" },
    { name: "Structured Output", description: "Force Claude to return JSON matching a tool schema" },
    { name: "Tool Use", description: "Let Claude call your functions to retrieve live data" },
    { name: "Extended Thinking", description: "Deep reasoning with a configurable thinking-token budget" },
    { name: "Vision Analysis", description: "Upload images and ask Claude questions about them" },
    { name: "Analyze Document", description: "Reason over long text passed as context" },
    { name: "Analyze PDF", description: "Native PDF understanding from a file or URL" },
    { name: "Cited Answer", description: "Answer a question with exact citations from a document" },
    { name: "Extract Structured Data", description: "Pull named fields from unstructured text or images" },
    { name: "Classify", description: "Categorize input into one of your labels" },
    { name: "Summarize", description: "Compress long text with length and style control" },
    { name: "Translate", description: "Translate text into a target language" },
    { name: "Sentiment Analysis", description: "Detect sentiment and emotion in text" },
    { name: "Moderate Content", description: "Safety-review text against a policy" },
    { name: "Code Review", description: "Analyze code and surface bugs, security, and fixes" },
    { name: "Generate Prompt", description: "Write an effective prompt for a described task" },
    { name: "Improve Prompt", description: "Rewrite an existing prompt to be clearer and stronger" },
    { name: "Prompt Caching", description: "Cache a large context block to cut cost on repeat calls" },
    { name: "Count Tokens", description: "Estimate token usage before sending — free, no charge" },
    { name: "List Models", description: "Fetch the live list of Claude models for your key" },
  ],
  gemini: [
    { name: "Chat Completion", description: "Send a prompt and get a response from Gemini" },
    { name: "Structured Output", description: "Force Gemini to return JSON matching a schema" },
    { name: "Function Calling", description: "Let Gemini call your functions to retrieve live data" },
    { name: "Deep Reasoning", description: "Thinking-budget reasoning for hard problems" },
    { name: "Vision Analysis", description: "Upload an image and ask Gemini about it" },
    { name: "Generate Image", description: "Create or edit images natively with Gemini" },
    { name: "Analyze Document", description: "Reason over long text passed as context" },
    { name: "Analyze PDF", description: "Native PDF understanding from a file or URL" },
    { name: "Analyze Audio", description: "Transcribe and understand audio files" },
    { name: "Analyze Video", description: "Describe and reason over video content" },
    { name: "Create Embedding", description: "Generate semantic vector embeddings for RAG" },
    { name: "Extract Structured Data", description: "Pull named fields from unstructured text" },
    { name: "Classify", description: "Categorize input into one of your labels" },
    { name: "Summarize", description: "Compress long text with style control" },
    { name: "Translate", description: "Translate text into a target language" },
    { name: "Generate Prompt", description: "Write an effective prompt for a described task" },
    { name: "Count Tokens", description: "Estimate token usage before sending — free" },
    { name: "List Models", description: "Fetch the live list of Gemini models for your key" },
  ],
  perplexity: [
    { name: "Search-augmented Chat", description: "Answer questions with live web search grounding" },
    { name: "Web Search", description: "Run a focused web search and synthesize an answer" },
    { name: "Cited Answer", description: "Answer with inline citations and source links" },
    { name: "Structured Output", description: "Return JSON matching a schema, web-grounded" },
    { name: "Reasoning", description: "Step-through reasoning with current data" },
    { name: "Deep Research", description: "Long-form researched report with sources" },
    { name: "Fact Check", description: "Verify a claim against current web sources" },
    { name: "Compare", description: "Compare options using up-to-date information" },
    { name: "News Digest", description: "Summarize recent news on a topic" },
    { name: "Extract Structured Data", description: "Pull named fields out of source text" },
    { name: "Classify", description: "Label text into one of your categories" },
    { name: "Summarize", description: "Condense text in a chosen style" },
    { name: "Translate", description: "Translate text into a target language" },
    { name: "Analyze Document", description: "Answer questions about a supplied document" },
    { name: "Generate Prompt", description: "Draft an optimized prompt from a task description" },
  ],
  xai: [
    { name: "Chat Completion", description: "Query Grok for a conversational response" },
    { name: "Structured Output", description: "Return JSON matching a schema" },
    { name: "Function Calling", description: "Let Grok call your tools/functions" },
    { name: "Reasoning", description: "Extended step-through reasoning" },
    { name: "Live Search", description: "Answer grounded in real-time web search" },
    { name: "Vision Analysis", description: "Describe or answer questions about an image" },
    { name: "Generate Image", description: "Create images from a text prompt" },
    { name: "Analyze Document", description: "Answer questions about a supplied document" },
    { name: "Extract Structured Data", description: "Pull named fields out of source text" },
    { name: "Classify", description: "Label text into one of your categories" },
    { name: "Summarize", description: "Condense text in a chosen style" },
    { name: "Translate", description: "Translate text into a target language" },
    { name: "Sentiment Analysis", description: "Score sentiment and extract key phrases" },
    { name: "Generate Prompt", description: "Draft an optimized prompt from a task" },
    { name: "Improve Prompt", description: "Rewrite an existing prompt to be sharper" },
  ],
  deepseek: [
    { name: "Chat Completion", description: "Query DeepSeek for a conversational response" },
    { name: "Structured Output", description: "Return JSON matching a schema" },
    { name: "Function Calling", description: "Let DeepSeek call your tools/functions" },
    { name: "Reasoning", description: "Thinking mode with exposed chain-of-thought" },
    { name: "Analyze Document", description: "Answer questions about a supplied document" },
    { name: "Extract Structured Data", description: "Pull named fields out of source text" },
    { name: "Classify", description: "Label text into one of your categories" },
    { name: "Summarize", description: "Condense text in a chosen style" },
    { name: "Translate", description: "Translate text into a target language" },
    { name: "Sentiment Analysis", description: "Score sentiment and extract key phrases" },
    { name: "Generate Prompt", description: "Draft an optimized prompt from a task" },
    { name: "Improve Prompt", description: "Rewrite an existing prompt to be sharper" },
  ],
  moonshot: [
    { name: "Chat Completion", description: "Query Kimi for a conversational response" },
    { name: "Code Generation", description: "Generate or explain code with Kimi-Code" },
    { name: "Structured Output", description: "Return JSON matching a schema" },
    { name: "Function Calling", description: "Let Kimi call your tools/functions" },
    { name: "Reasoning", description: "Thinking mode for hard, multi-step problems" },
    { name: "Vision Analysis", description: "Describe or answer questions about an image" },
    { name: "Analyze Document", description: "Answer questions about a long document" },
    { name: "Extract Structured Data", description: "Pull named fields out of source text" },
    { name: "Classify", description: "Label text into one of your categories" },
    { name: "Summarize", description: "Condense text in a chosen style" },
    { name: "Translate", description: "Translate text into a target language" },
    { name: "Sentiment Analysis", description: "Score sentiment and extract key phrases" },
    { name: "Generate Prompt", description: "Draft an optimized prompt from a task" },
    { name: "Improve Prompt", description: "Rewrite an existing prompt to be sharper" },
  ],
  openrouter: [
    { name: "Chat Completion", description: "Query any OpenRouter model for a response" },
    { name: "Code Generation", description: "Generate or explain code with a coding model" },
    { name: "Structured Output", description: "Return JSON matching a schema" },
    { name: "Function Calling", description: "Let the model call your tools/functions" },
    { name: "Reasoning", description: "Route to a reasoning model for hard problems" },
    { name: "Vision Analysis", description: "Describe or answer questions about an image" },
    { name: "Analyze Document", description: "Answer questions about a long document" },
    { name: "Extract Structured Data", description: "Pull named fields out of source text" },
    { name: "Classify", description: "Label text into one of your categories" },
    { name: "Summarize", description: "Condense text in a chosen style" },
    { name: "Translate", description: "Translate text into a target language" },
    { name: "Sentiment Analysis", description: "Score sentiment and extract key phrases" },
    { name: "Generate Prompt", description: "Draft an optimized prompt from a task" },
    { name: "Improve Prompt", description: "Rewrite an existing prompt to be sharper" },
  ],
  zai: [
    { name: "Chat Completion", description: "Chat with GLM-5.2 and the GLM family" },
    { name: "Code Generation", description: "Generate or explain code with GLM" },
    { name: "Structured Output", description: "Return JSON matching a schema" },
    { name: "Function Calling", description: "Let GLM call your tools/functions" },
    { name: "Reasoning", description: "Deep step-by-step reasoning with GLM-5.2" },
    { name: "Vision Analysis", description: "Describe or answer questions about an image" },
    { name: "Analyze Document", description: "Answer questions about a long document" },
    { name: "Extract Structured Data", description: "Pull named fields out of source text" },
    { name: "Classify", description: "Label text into one of your categories" },
    { name: "Summarize", description: "Condense text in a chosen style" },
    { name: "Translate", description: "Translate text into a target language" },
    { name: "Sentiment Analysis", description: "Score sentiment and extract key phrases" },
    { name: "Generate Prompt", description: "Draft an optimized prompt from a task" },
    { name: "Improve Prompt", description: "Rewrite an existing prompt to be sharper" },
  ],
  minimax: [
    { name: "Chat Completion", description: "Chat with MiniMax-M3 and the M-series" },
    { name: "Code Generation", description: "Generate or explain code with MiniMax" },
    { name: "Structured Output", description: "Return JSON matching a schema" },
    { name: "Function Calling", description: "Let MiniMax call your tools/functions" },
    { name: "Reasoning", description: "Deep step-by-step reasoning with MiniMax-M3" },
    { name: "Vision Analysis", description: "Describe or answer questions about an image" },
    { name: "Analyze Document", description: "Answer questions about a 1M-token document" },
    { name: "Extract Structured Data", description: "Pull named fields out of source text" },
    { name: "Classify", description: "Label text into one of your categories" },
    { name: "Summarize", description: "Condense text in a chosen style" },
    { name: "Translate", description: "Translate text into a target language" },
    { name: "Sentiment Analysis", description: "Score sentiment and extract key phrases" },
    { name: "Generate Prompt", description: "Draft an optimized prompt from a task" },
    { name: "Improve Prompt", description: "Rewrite an existing prompt to be sharper" },
  ],
  sakana: [
    { name: "Chat Completion", description: "Chat with the Fugu multi-agent council" },
    { name: "Code Generation", description: "Generate or explain code with fugu-ultra" },
    { name: "Structured Output", description: "Return JSON matching a schema" },
    { name: "Function Calling", description: "Let Fugu call your tools/functions" },
    { name: "Reasoning", description: "Deep multi-agent reasoning with fugu-ultra" },
    { name: "Vision Analysis", description: "Describe or answer questions about an image" },
    { name: "Analyze Document", description: "Answer questions about a long document" },
    { name: "Extract Structured Data", description: "Pull named fields out of source text" },
    { name: "Classify", description: "Label text into one of your categories" },
    { name: "Summarize", description: "Condense text in a chosen style" },
    { name: "Translate", description: "Translate text into a target language" },
    { name: "Sentiment Analysis", description: "Score sentiment and extract key phrases" },
    { name: "Generate Prompt", description: "Draft an optimized prompt from a task" },
    { name: "Improve Prompt", description: "Rewrite an existing prompt to be sharper" },
  ],
  nvidia_nim: [
    { name: "Chat Completion", description: "Query an NVIDIA-hosted model for a response" },
    { name: "Code Generation", description: "Generate or explain code with Qwen Coder" },
    { name: "Structured Output", description: "Return JSON matching a schema" },
    { name: "Function Calling", description: "Let the model call your tools/functions" },
    { name: "Reasoning", description: "Step-through reasoning with Nemotron" },
    { name: "Vision Analysis", description: "Describe or answer questions about an image" },
    { name: "Create Embedding", description: "Embed text with NeMo Retriever models" },
    { name: "Extract Structured Data", description: "Pull named fields out of source text" },
    { name: "Classify", description: "Label text into one of your categories" },
    { name: "Summarize", description: "Condense text in a chosen style" },
    { name: "Translate", description: "Translate text into a target language" },
    { name: "Sentiment Analysis", description: "Score sentiment and extract key phrases" },
    { name: "Generate Prompt", description: "Draft an optimized prompt from a task" },
    { name: "Improve Prompt", description: "Rewrite an existing prompt to be sharper" },
  ],

  // ── AI Agent Building Blocks ────────────────────────────────────────────────
  ai_agent: [
    { name: "Run Agent Loop", description: "Execute the full ReAct agent loop with tools" },
    { name: "Single Tool Call", description: "Call one specific tool and return its result" },
    { name: "Plan & Execute", description: "Agent plans steps, then executes them sequentially" },
    { name: "Reflection Step", description: "Agent reflects on previous output and self-corrects" },
    { name: "Summarize Memory", description: "Compress long conversation history into a summary" },
  ],
  agent_llm: [
    { name: "Send Message", description: "Send a message to the configured LLM" },
    { name: "Stream Response", description: "Stream tokens for low-latency output" },
    { name: "System Prompt Override", description: "Inject a custom system prompt at runtime" },
  ],
  agent_memory: [
    { name: "Store Memory", description: "Save a key-value pair to agent memory" },
    { name: "Retrieve Memory", description: "Load stored context by key" },
    { name: "Semantic Search", description: "Find the most similar past memories by vector" },
    { name: "Clear Memory", description: "Wipe all stored memory for this session" },
    { name: "List All Memories", description: "Return all stored memory entries" },
  ],
  agent_tool: [
    { name: "Execute Tool", description: "Run a registered tool with the given inputs" },
    { name: "List Available Tools", description: "Return all tools the agent can call" },
    { name: "Validate Tool Input", description: "Check inputs before calling a tool" },
  ],
  agent_memory_window: [
    { name: "Append Message", description: "Add a message to the sliding window buffer" },
    { name: "Get Window", description: "Return the last N messages as context" },
    { name: "Clear Window", description: "Reset the sliding window buffer" },
  ],
  agent_memory_redis: [
    { name: "Store Memory", description: "Save a conversation snapshot to Redis" },
    { name: "Load Memory", description: "Retrieve conversation context from Redis" },
    { name: "TTL Expire", description: "Set time-to-live for memory expiration" },
    { name: "Delete Memory", description: "Remove a memory key from Redis" },
  ],
  agent_memory_mongodb: [
    { name: "Store Memory", description: "Persist conversation memory in MongoDB" },
    { name: "Load Memory", description: "Fetch conversation history from MongoDB" },
    { name: "Search Memory", description: "Query past interactions by metadata" },
    { name: "Delete Memory", description: "Remove a memory document from MongoDB" },
  ],
  agent_memory_postgres: [
    { name: "Store Memory", description: "Write conversation memory to Postgres" },
    { name: "Load Memory", description: "Read conversation history from Postgres" },
    { name: "Search Memory", description: "Query memory by semantic similarity" },
    { name: "Delete Memory", description: "Remove memory records from Postgres" },
  ],
  agent_memory_pinecone: [
    { name: "Upsert Memory", description: "Store a vector embedding in Pinecone" },
    { name: "Semantic Search", description: "Find the most relevant past memories" },
    { name: "Delete Memory", description: "Remove vectors from Pinecone by ID" },
    { name: "Fetch by ID", description: "Retrieve a specific memory vector by its ID" },
  ],
  agent_memory_supabase: [
    { name: "Store Memory", description: "Persist memory in Supabase with pgvector" },
    { name: "Semantic Search", description: "Vector similarity search over stored memories" },
    { name: "Delete Memory", description: "Remove a memory record from Supabase" },
  ],
  agent_memory_zep: [
    { name: "Add Memory", description: "Push new messages into the Zep memory store" },
    { name: "Get Memory", description: "Retrieve summarized session memory from Zep" },
    { name: "Search Memory", description: "Semantic search over Zep memory entries" },
    { name: "Delete Session", description: "Clear all memory for a given session ID" },
  ],

  // ── AI Utilities ─────────────────────────────────────────────────────────────
  ai_classify: [
    { name: "Classify Text", description: "Route text into one of your defined categories" },
    { name: "Multi-label Classification", description: "Assign multiple categories to a single input" },
    { name: "Sentiment Analysis", description: "Detect positive, negative, or neutral tone" },
    { name: "Intent Detection", description: "Identify user intent from a message" },
    { name: "Topic Tagging", description: "Auto-tag content with relevant topics" },
  ],
  ai_extract: [
    { name: "Extract Named Entities", description: "Pull out people, companies, dates, and places" },
    { name: "Extract JSON Schema", description: "Fill a typed schema from unstructured text" },
    { name: "Extract Contact Info", description: "Pull emails, phone numbers, and addresses" },
    { name: "Extract Key Facts", description: "Identify the most important sentences" },
    { name: "Extract Table Data", description: "Convert a text table to structured rows" },
  ],
  ai_transform: [
    { name: "Rewrite Tone", description: "Change the tone — formal, casual, or persuasive" },
    { name: "Expand Content", description: "Elaborate a short blurb into full paragraphs" },
    { name: "Condense Content", description: "Reduce verbose text to its essence" },
    { name: "Translate Language", description: "Convert text to another language" },
    { name: "Fix Grammar", description: "Correct grammar, spelling, and punctuation" },
    { name: "SEO Optimize", description: "Rewrite for search engine ranking" },
  ],

  // ── Data & APIs ──────────────────────────────────────────────────────────────
  http_request: [
    { name: "GET Request", description: "Fetch data from any REST API endpoint" },
    { name: "POST Request", description: "Send JSON body to a REST API" },
    { name: "PUT / PATCH", description: "Update a resource via PUT or PATCH" },
    { name: "DELETE Request", description: "Remove a resource via DELETE" },
    { name: "Upload File (multipart)", description: "Upload a file as multipart form data" },
    { name: "Download File", description: "Download binary content from a URL" },
    { name: "Authenticated Request", description: "Make a request with OAuth, API key, or Basic Auth" },
    { name: "Paginated Fetch", description: "Auto-iterate through paginated API responses" },
  ],

  // ── Data Processing ──────────────────────────────────────────────────────────

  // ── Research ──────────────────────────────────────────────────────────────────
  web_scraper: [
    { name: "Scrape Page Content", description: "Extract full text content from a URL" },
    { name: "Extract Links", description: "Pull all anchor links from a page" },
    { name: "Scrape Table", description: "Extract HTML table data as structured rows" },
    { name: "Screenshot Page", description: "Capture a screenshot of the rendered page" },
    { name: "Fill & Submit Form", description: "Automate form submission on a webpage" },
    { name: "Wait for Element", description: "Wait for a CSS selector before extracting" },
    { name: "Scrape Multiple Pages", description: "Batch scrape an array of URLs" },
  ],
  web_search: [
    { name: "Web Search", description: "Search the web and return top results" },
    { name: "Image Search", description: "Search for images matching a query" },
    { name: "News Search", description: "Find recent news articles on a topic" },
    { name: "Site-specific Search", description: "Search within a specific domain" },
  ],
  pubmed_search: [
    { name: "Search Articles", description: "Find medical research papers on PubMed" },
    { name: "Fetch Abstract", description: "Retrieve the abstract for a specific PMID" },
    { name: "Find by Author", description: "Search articles by author name" },
    { name: "MeSH Term Search", description: "Search using medical subject headings" },
  ],
  arxiv_search: [
    { name: "Search Papers", description: "Find research papers on arXiv by keyword" },
    { name: "Fetch Paper Details", description: "Get full metadata for an arXiv paper" },
    { name: "Search by Author", description: "Find papers by a specific author" },
    { name: "Recent Papers", description: "Get papers published in the last N days" },
  ],
  wikipedia_lookup: [
    { name: "Search Wikipedia", description: "Find Wikipedia articles matching a query" },
    { name: "Get Article Summary", description: "Fetch the intro section of a Wikipedia page" },
    { name: "Get Full Article", description: "Retrieve the complete Wikipedia article text" },
    { name: "Get Infobox Data", description: "Extract structured data from the article infobox" },
  ],
  drug_lookup: [
    { name: "Lookup Drug Info", description: "Get drug details from FDA database" },
    { name: "Drug Interactions", description: "Check interactions between two drugs" },
    { name: "Dosage Info", description: "Retrieve recommended dosage guidelines" },
    { name: "Generic vs Brand Name", description: "Find generic equivalents for brand-name drugs" },
  ],
  clinical_trials: [
    { name: "Search Trials", description: "Find clinical trials by condition or drug" },
    { name: "Get Trial Details", description: "Fetch full details for a specific trial NCT ID" },
    { name: "Filter by Phase", description: "Find trials in a specific phase (I, II, III)" },
    { name: "Recruiting Trials Only", description: "Show only currently recruiting trials" },
  ],
  weather: [
    { name: "Current Weather", description: "Get real-time weather for a city or coordinates" },
    { name: "5-day Forecast", description: "Fetch the upcoming 5-day weather forecast" },
    { name: "Hourly Forecast", description: "Get weather broken down by hour" },
    { name: "Historical Weather", description: "Fetch past weather data for a date range" },
    { name: "Air Quality Index", description: "Get the AQI and pollutant levels for a location" },
  ],
  news_search: [
    { name: "Search News", description: "Find recent news articles by keyword" },
    { name: "Top Headlines", description: "Get today's top headlines by country or category" },
    { name: "Search by Source", description: "Filter news from specific outlets" },
    { name: "Trending Topics", description: "Get currently trending news topics" },
  ],
  stock_price: [
    { name: "Get Current Price", description: "Fetch the live stock price for a ticker" },
    { name: "Get OHLCV Data", description: "Retrieve open, high, low, close, volume data" },
    { name: "Historical Prices", description: "Fetch price history for a date range" },
    { name: "Company Overview", description: "Get company metadata and fundamentals" },
    { name: "Search Ticker", description: "Find a company's ticker symbol by name" },
  ],
  ip_lookup: [
    { name: "Lookup IP Info", description: "Get country, city, ISP, and org for an IP" },
    { name: "Check IP Reputation", description: "Flag known malicious or VPN IPs" },
    { name: "Reverse DNS Lookup", description: "Resolve hostname from IP address" },
    { name: "Get My IP", description: "Return the outbound IP of this workflow" },
  ],

  // Logic & Flow nodes intentionally have no actions — one node does one thing,
  // configured in its own panel. See ACTION_PICKER_CATEGORIES.

  // ── Code ─────────────────────────────────────────────────────────────────────
  code: [
    { name: "Run JavaScript", description: "Execute a JavaScript snippet with access to $input" },
    { name: "Run Python", description: "Execute a Python script with access to workflow data" },
    { name: "Transform Data", description: "Apply a custom transformation to the payload" },
    { name: "Parse & Return", description: "Parse input and return a cleaned-up object" },
    { name: "Validate Schema", description: "Check that data matches a JSON schema" },
    { name: "Custom Logic", description: "Write any custom business logic in code" },
  ],
  counter: [
    { name: "Increment", description: "Add 1 (or N) to the counter" },
    { name: "Decrement", description: "Subtract 1 (or N) from the counter" },
    { name: "Reset", description: "Reset the counter to zero" },
    { name: "Get Value", description: "Return the current counter value without changing it" },
  ],
  random_pick: [
    { name: "Pick Random Item", description: "Choose a random element from an array" },
    { name: "Pick N Random Items", description: "Select N random items without replacement" },
    { name: "Shuffle Array", description: "Randomize the order of an array" },
    { name: "Random Number", description: "Generate a random number in a range" },
  ],
  unit_converter: [
    { name: "Convert Length", description: "Convert meters, feet, miles, km, etc." },
    { name: "Convert Weight", description: "Convert kg, lbs, oz, grams, etc." },
    { name: "Convert Temperature", description: "Convert between Celsius, Fahrenheit, Kelvin" },
    { name: "Convert Currency", description: "Convert between currencies at live rates" },
    { name: "Convert Data Size", description: "Convert bytes, KB, MB, GB, TB" },
  ],

  // ── Messaging & Communication ─────────────────────────────────────────────────

  // ── Integrations: Productivity ────────────────────────────────────────────────

  // ── Developer Tools ──────────────────────────────────────────────────────────
  github: [
    { name: "List Issues", description: "List open or closed issues in a repository" },
    { name: "Get Issue", description: "Fetch a single issue with labels and assignees" },
    { name: "Create Issue", description: "Open a new issue in a GitHub repository" },
    { name: "Update Issue", description: "Edit title, body, labels, assignees or state" },
    { name: "Close Issue", description: "Close an issue with a reason" },
    { name: "Add Labels", description: "Add labels to an existing issue" },
    { name: "Add Comment", description: "Add a comment to an issue or PR" },
    { name: "List Comments", description: "List comments on an issue or PR" },
    { name: "List Pull Requests", description: "List open, closed or all PRs" },
    { name: "Get Pull Request", description: "Fetch a PR with diff stats and merge state" },
    { name: "Create Pull Request", description: "Open a new PR from a branch" },
    { name: "Update Pull Request", description: "Edit a PR's title, body, base or state" },
    { name: "Merge Pull Request", description: "Merge a PR via merge, squash or rebase" },
    { name: "List PR Files", description: "List files changed in a pull request" },
    { name: "Request Reviewers", description: "Request reviews from users or teams" },
    { name: "Submit Review", description: "Approve, request changes or comment on a PR" },
    { name: "Create / Update File", description: "Commit a new or updated file to a repo" },
    { name: "Get File", description: "Read a file's content or list a directory" },
    { name: "Delete File", description: "Remove a file with a commit" },
    { name: "List Branches", description: "List all branches in a repository" },
    { name: "Get Branch", description: "Fetch a branch and its head SHA" },
    { name: "Create Branch", description: "Create a new branch from another branch" },
    { name: "List Commits", description: "List commits, filterable by branch or path" },
    { name: "Get Commit", description: "Fetch a commit with stats and changed files" },
    { name: "Create Release", description: "Publish a new release for a tag" },
    { name: "List Releases", description: "List a repository's releases" },
    { name: "Latest Release", description: "Get the most recent published release" },
    { name: "Workflow Runs", description: "List GitHub Actions workflow runs" },
    { name: "Dispatch Workflow", description: "Trigger a workflow_dispatch run" },
    { name: "Get Repository", description: "Fetch metadata about a repository" },
    { name: "My Repositories", description: "List repos for the authenticated user" },
    { name: "Create Repository", description: "Create a new repo under a user or org" },
    { name: "Get User", description: "Fetch a public GitHub user profile" },
    { name: "My Profile", description: "Get the authenticated user's profile" },
    { name: "Search Issues", description: "Search issues and PRs across GitHub" },
    { name: "Search Repositories", description: "Search public repositories" },
    { name: "Search Code", description: "Search code across GitHub" },
  ],
  azure_devops: [
    { name: "Create Work Item", description: "Create a new task, bug, or user story" },
    { name: "Get Work Item", description: "Fetch a specific work item by ID" },
    { name: "Update Work Item", description: "Modify fields of an existing work item" },
    { name: "Delete Work Item", description: "Delete a work item by ID" },
    { name: "Query Work Items", description: "Run a WIQL query against work items" },
    { name: "Add Work Item Comment", description: "Comment on a work item" },
    { name: "List Work Item Comments", description: "List comments on a work item" },
    { name: "List Work Item Types", description: "List the work item types in a project" },
    { name: "Create PR", description: "Open a pull request in a repository" },
    { name: "Get PR", description: "Fetch a pull request by ID" },
    { name: "List PRs", description: "List pull requests in a repository" },
    { name: "Update PR", description: "Edit a pull request's title, body, or status" },
    { name: "Complete PR", description: "Merge a pull request (squash/merge/rebase)" },
    { name: "Add PR Reviewer", description: "Add a reviewer to a pull request" },
    { name: "List Repos", description: "List Git repositories in a project" },
    { name: "Get Repo", description: "Fetch a repository's details" },
    { name: "List Branches", description: "List branches in a repository" },
    { name: "List Commits", description: "List recent commits in a repository" },
    { name: "List Pipelines", description: "List pipelines in a project" },
    { name: "Get Pipeline", description: "Fetch a pipeline definition" },
    { name: "Run Pipeline", description: "Trigger a pipeline run on a branch" },
    { name: "List Pipeline Runs", description: "List runs of a pipeline" },
    { name: "Get Pipeline Run", description: "Fetch a specific pipeline run" },
    { name: "List Builds", description: "List recent builds in a project" },
    { name: "Get Build", description: "Check the result of a build" },
    { name: "Queue Build", description: "Queue a build for a definition" },
    { name: "List Projects", description: "List projects in the organization" },
    { name: "Get Project", description: "Fetch a project's details" },
    { name: "List Teams", description: "List teams in a project" },
    { name: "List Iterations", description: "List a team's iterations (sprints)" },
    { name: "List Areas", description: "List area paths in a project" },
  ],
  sentry: [
    { name: "List Issues", description: "Fetch issues from a Sentry project with filters" },
    { name: "Get Issue", description: "Fetch a single issue by its ID" },
    { name: "Update Issue", description: "Change an issue's status or assignee" },
    { name: "Resolve Issue", description: "Mark a Sentry issue as resolved" },
    { name: "Ignore Issue", description: "Mute an issue so it stops alerting" },
    { name: "Assign Issue", description: "Assign an issue to a team member" },
    { name: "Delete Issue", description: "Permanently delete an issue" },
    { name: "List Events", description: "List error events for an issue" },
    { name: "Latest Event", description: "Fetch the most recent event for an issue" },
    { name: "List Issue Comments", description: "Read activity-note comments on an issue" },
    { name: "Add Issue Comment", description: "Post a note comment on an issue" },
    { name: "List Issue Tags", description: "List the tags recorded on an issue" },
    { name: "List Projects", description: "List all projects in an organization" },
    { name: "Get Project", description: "Fetch a single project by slug" },
    { name: "Create Project", description: "Create a project under a team" },
    { name: "Update Project", description: "Rename or reconfigure a project" },
    { name: "List DSN Keys", description: "List a project's client DSN keys" },
    { name: "List Project Issues", description: "List issues scoped to one project" },
    { name: "List Releases", description: "List releases in an organization" },
    { name: "Get Release", description: "Fetch a single release by version" },
    { name: "Create Release", description: "Create a release across projects" },
    { name: "Finalize Release", description: "Mark a release as released" },
    { name: "Create Deploy", description: "Record a deploy for a release" },
    { name: "List Deploys", description: "List deploys for a release" },
    { name: "List Teams", description: "List teams in an organization" },
    { name: "List Team Projects", description: "List projects owned by a team" },
    { name: "List Team Members", description: "List members of a team" },
    { name: "List Organizations", description: "List orgs your token can access" },
    { name: "Get Organization", description: "Fetch details for one organization" },
    { name: "List Org Members", description: "List members of an organization" },
    { name: "Capture Event", description: "Send a custom event to a project DSN" },
  ],
  vercel: [
    { name: "List Deployments", description: "List recent deployments with state filter" },
    { name: "Get Deployment", description: "Fetch a single deployment by ID" },
    { name: "Trigger Deploy", description: "Deploy a project from a git branch" },
    { name: "Redeploy", description: "Re-run a previous deployment" },
    { name: "Promote to Prod", description: "Promote a deployment to production" },
    { name: "Cancel Deploy", description: "Stop a running deployment" },
    { name: "Delete Deploy", description: "Permanently delete a deployment" },
    { name: "List Files", description: "List the file tree of a deployment" },
    { name: "Build Logs", description: "Fetch build/runtime events for a deployment" },
    { name: "Deploy Aliases", description: "List aliases assigned to a deployment" },
    { name: "List Projects", description: "List all projects in the account or team" },
    { name: "Get Project", description: "Fetch a single project by name or ID" },
    { name: "Create Project", description: "Create a new project, optionally git-linked" },
    { name: "Update Project", description: "Change project framework, build, or root dir" },
    { name: "Delete Project", description: "Permanently delete a project" },
    { name: "Pause Project", description: "Pause production deployments for a project" },
    { name: "Unpause Project", description: "Resume a paused project" },
    { name: "List Project Domains", description: "List domains attached to a project" },
    { name: "Add Project Domain", description: "Attach a domain to a project" },
    { name: "Remove Project Domain", description: "Detach a domain from a project" },
    { name: "Verify Project Domain", description: "Trigger verification of a project domain" },
    { name: "List Env Vars", description: "List a project's environment variables" },
    { name: "Get Env Var", description: "Fetch one env var, optionally decrypted" },
    { name: "Create Env Var", description: "Add an env var to a project" },
    { name: "Update Env Var", description: "Change an existing env var's value or targets" },
    { name: "Delete Env Var", description: "Remove an env var from a project" },
    { name: "List Account Domains", description: "List domains owned by the account" },
    { name: "Get Domain", description: "Fetch details for an account domain" },
    { name: "Add Account Domain", description: "Register a domain on the account" },
    { name: "Remove Domain", description: "Delete a domain from the account" },
    { name: "Check Domain Availability", description: "Check if a domain can be purchased" },
    { name: "List DNS Records", description: "List DNS records for a domain" },
    { name: "Create DNS Record", description: "Add an A/CNAME/MX/TXT DNS record" },
    { name: "Delete DNS Record", description: "Remove a DNS record by ID" },
    { name: "List Aliases", description: "List aliases for the account or a project" },
    { name: "Assign Alias", description: "Point an alias at a deployment" },
    { name: "Delete Alias", description: "Remove an alias" },
    { name: "List Teams", description: "List teams the token can access" },
    { name: "Get Team", description: "Fetch details for a team" },
    { name: "List Team Members", description: "List members of a team" },
    { name: "List Edge Configs", description: "List the account's Edge Config stores" },
    { name: "Current User", description: "Fetch the authenticated Vercel user" },
  ],
  netlify: [
    { name: "List Sites", description: "List all sites in the account" },
    { name: "Get Site", description: "Fetch a single site by ID" },
    { name: "Create Site", description: "Create a new site, optionally git-linked" },
    { name: "Update Site", description: "Change a site's name, domain, or build settings" },
    { name: "Delete Site", description: "Permanently delete a site" },
    { name: "List Deploys", description: "Fetch recent deploy history for a site" },
    { name: "Get Deploy", description: "Check the status of a single deploy" },
    { name: "Create Deploy", description: "Start a new deploy for a site" },
    { name: "Cancel Deploy", description: "Cancel a currently running deploy" },
    { name: "Restore Deploy", description: "Roll a site back to a previous deploy" },
    { name: "Lock Deploy", description: "Prevent new deploys from auto-publishing" },
    { name: "Unlock Deploy", description: "Resume auto-publishing of deploys" },
    { name: "List Deploy Files", description: "List the files in a deploy" },
    { name: "Trigger Build", description: "Kick off a fresh build for a site" },
    { name: "List Builds", description: "List build history for a site" },
    { name: "Get Build", description: "Fetch a single build by ID" },
    { name: "List Functions", description: "List a site's serverless functions" },
    { name: "List Forms", description: "List forms detected on a site" },
    { name: "List Submissions", description: "List submissions for a form" },
    { name: "Delete Submission", description: "Delete a form submission" },
    { name: "List Env Vars", description: "List environment variables for a site" },
    { name: "Get Env Var", description: "Fetch one env var by key" },
    { name: "Set Env Var", description: "Create or update an env var on a site" },
    { name: "Delete Env Var", description: "Remove an env var from a site" },
    { name: "List DNS Zones", description: "List managed DNS zones" },
    { name: "Get DNS Zone", description: "Fetch a single DNS zone" },
    { name: "List DNS Records", description: "List records in a DNS zone" },
    { name: "Create DNS Record", description: "Add an A/CNAME/MX/TXT record" },
    { name: "Delete DNS Record", description: "Remove a DNS record by ID" },
    { name: "List Hooks", description: "List notification/build hooks for a site" },
    { name: "Create Hook", description: "Add a deploy-event webhook to a site" },
    { name: "Delete Hook", description: "Remove a hook by ID" },
    { name: "List Accounts", description: "List Netlify accounts/teams you belong to" },
    { name: "List Account Members", description: "List members of an account" },
    { name: "Current User", description: "Fetch the authenticated Netlify user" },
  ],
  pagerduty: [
    { name: "List Incidents", description: "List incidents with status/service/urgency filters" },
    { name: "Get Incident", description: "Fetch a single incident by ID" },
    { name: "Create Incident", description: "Trigger a new PagerDuty incident" },
    { name: "Update Incident", description: "Change an incident's title, status, urgency or priority" },
    { name: "Resolve Incident", description: "Resolve an active incident" },
    { name: "Acknowledge Incident", description: "Acknowledge an incident to stop escalation" },
    { name: "Snooze Incident", description: "Snooze an incident for a duration" },
    { name: "Merge Incidents", description: "Merge source incidents into a target incident" },
    { name: "Add Note", description: "Add a note to an active incident" },
    { name: "List Notes", description: "List all notes on an incident" },
    { name: "Add Responder", description: "Request a user to respond to an incident" },
    { name: "List Alerts", description: "List alerts attached to an incident" },
    { name: "List Log Entries", description: "List the timeline log entries of an incident" },
    { name: "List Services", description: "List PagerDuty services" },
    { name: "Get Service", description: "Fetch a service by ID" },
    { name: "Create Service", description: "Create a new service with an escalation policy" },
    { name: "Update Service", description: "Update a service's name, status or policy" },
    { name: "Delete Service", description: "Delete a service" },
    { name: "List Escalation Policies", description: "List escalation policies" },
    { name: "Get Escalation Policy", description: "Fetch an escalation policy by ID" },
    { name: "Delete Escalation Policy", description: "Delete an escalation policy" },
    { name: "List Schedules", description: "List on-call schedules" },
    { name: "Get Schedule", description: "Fetch a schedule with its on-call layers" },
    { name: "List Overrides", description: "List schedule overrides in a time window" },
    { name: "Create Override", description: "Override a schedule for a user and time range" },
    { name: "List On-Calls", description: "Find who is on-call, filtered by policy/schedule/user" },
    { name: "List Users", description: "List PagerDuty users" },
    { name: "Get User", description: "Fetch a user by ID" },
    { name: "Get Current User", description: "Fetch the authenticated user" },
    { name: "List Contact Methods", description: "List a user's contact methods" },
    { name: "List Teams", description: "List teams" },
    { name: "Get Team", description: "Fetch a team by ID" },
    { name: "List Team Members", description: "List the members of a team" },
    { name: "List Priorities", description: "List configured incident priorities" },
    { name: "Trigger Event", description: "Fire an Events API v2 alert via routing key" },
    { name: "Acknowledge Event", description: "Acknowledge an Events API v2 alert by dedup key" },
    { name: "Resolve Event", description: "Resolve an Events API v2 alert by dedup key" },
  ],
  datadog: [
    { name: "Submit Metric", description: "Post a custom metric point to Datadog" },
    { name: "Query Metrics", description: "Query a timeseries with a metric query" },
    { name: "List Active Metrics", description: "List metrics actively reporting" },
    { name: "Get Metric Metadata", description: "Fetch a metric's metadata" },
    { name: "Update Metric Metadata", description: "Edit a metric's description, unit or type" },
    { name: "Search Metrics", description: "Search the metric catalog" },
    { name: "Create Event", description: "Send an event to the Datadog event stream" },
    { name: "Get Event", description: "Fetch an event by ID" },
    { name: "List Events", description: "List events in a time window" },
    { name: "Create Monitor", description: "Set up a Datadog alert monitor" },
    { name: "Get Monitor", description: "Fetch a monitor by ID" },
    { name: "List Monitors", description: "List monitors with tag/name filters" },
    { name: "Update Monitor", description: "Edit a monitor's query, message or tags" },
    { name: "Delete Monitor", description: "Delete a monitor" },
    { name: "Mute Monitor", description: "Temporarily silence a monitor" },
    { name: "Unmute Monitor", description: "Re-enable a muted monitor" },
    { name: "Search Monitors", description: "Search monitors by query" },
    { name: "Send Log", description: "Push a log entry to Datadog Logs" },
    { name: "Search Logs", description: "Query the Datadog log explorer" },
    { name: "List Dashboards", description: "List all dashboards" },
    { name: "Get Dashboard", description: "Fetch a dashboard by ID" },
    { name: "Delete Dashboard", description: "Delete a dashboard" },
    { name: "List Downtimes", description: "List scheduled downtimes" },
    { name: "Schedule Downtime", description: "Mute alerts for a scope and time range" },
    { name: "Cancel Downtime", description: "Cancel an active downtime" },
    { name: "List Hosts", description: "List reporting hosts with a filter" },
    { name: "Get Host Totals", description: "Get active/up host counts" },
    { name: "Mute Host", description: "Mute alerts for a host" },
    { name: "Unmute Host", description: "Unmute a host" },
    { name: "Get Host Tags", description: "Get the tags on a host" },
    { name: "Add Host Tags", description: "Add tags to a host" },
    { name: "List SLOs", description: "List service level objectives" },
    { name: "Get SLO", description: "Fetch an SLO by ID" },
    { name: "Delete SLO", description: "Delete an SLO" },
    { name: "List Incidents", description: "List incidents" },
    { name: "Get Incident", description: "Fetch an incident by ID" },
    { name: "Create Incident", description: "Declare a new incident" },
    { name: "Update Incident", description: "Change an incident's title or status" },
    { name: "List Synthetic Tests", description: "List synthetic monitoring tests" },
    { name: "Get Synthetic Test", description: "Fetch a synthetic test by public ID" },
    { name: "Trigger Synthetic Test", description: "Run a synthetic test on demand" },
    { name: "List Users", description: "List org users" },
    { name: "Get User", description: "Fetch a user by ID" },
    { name: "Post Service Check", description: "Submit a service check status" },
  ],
  npm_package_info: [
    { name: "Get Package Info", description: "Fetch metadata for an npm package" },
    { name: "Get Latest Version", description: "Find the latest published version" },
    { name: "Check Vulnerabilities", description: "Scan for known CVEs in a package" },
    { name: "Download Stats", description: "Get weekly download count from npm" },
  ],
  semver_compare: [
    { name: "Compare Versions", description: "Check if version A is newer than version B" },
    { name: "Satisfies Range", description: "Check if a version satisfies a semver range" },
    { name: "Get Latest Matching", description: "Find the latest version matching a range" },
  ],
  docker_run: [
    { name: "Run Container", description: "Start a Docker container from an image" },
    { name: "Pull Image", description: "Pull a Docker image from a registry" },
    { name: "Exec in Container", description: "Run a command inside a running container" },
    { name: "Stop Container", description: "Gracefully stop a running container" },
    { name: "Remove Container", description: "Delete a stopped container" },
  ],
  ssh: [
    { name: "Execute Command", description: "Run a shell command on a remote server via SSH" },
    { name: "Transfer File (SCP)", description: "Upload or download a file via SCP" },
    { name: "Run Script", description: "Execute a multi-line script on a remote host" },
    { name: "Check Server Status", description: "Ping a server and verify it's reachable" },
  ],
  sftp: [
    { name: "Upload File", description: "Transfer a file to an SFTP server" },
    { name: "Download File", description: "Fetch a file from an SFTP server" },
    { name: "List Files", description: "List files in an SFTP directory" },
    { name: "Delete File", description: "Remove a file from an SFTP server" },
    { name: "Create Directory", description: "Create a new directory on an SFTP server" },
  ],
  grpc_call: [
    { name: "Unary Call", description: "Make a single request/response gRPC call" },
    { name: "Server Streaming", description: "Open a gRPC server-side streaming request" },
    { name: "List Services", description: "Enumerate available gRPC services and methods" },
  ],
  webhook_response: [
    { name: "Respond with JSON", description: "Send a JSON response back to the webhook caller" },
    { name: "Respond with HTML", description: "Return an HTML page to the webhook caller" },
    { name: "Respond with Status", description: "Return a status code with an optional body" },
    { name: "Redirect", description: "Redirect the caller to another URL" },
  ],
  docker: [
    { name: "List Containers", description: "List all running Docker containers" },
    { name: "Start Container", description: "Start a stopped Docker container" },
    { name: "Stop Container", description: "Stop a running Docker container" },
    { name: "Get Container Logs", description: "Fetch stdout/stderr logs from a container" },
    { name: "Build Image", description: "Build a Docker image from a Dockerfile" },
  ],
  ssl: [
    { name: "Check Certificate", description: "Verify the SSL cert for a domain" },
    { name: "Get Expiry Date", description: "Find when an SSL certificate expires" },
    { name: "Check Chain Validity", description: "Validate the full certificate chain" },
    { name: "Check HTTPS Redirect", description: "Verify HTTP redirects to HTTPS correctly" },
  ],
  dns: [
    { name: "DNS Lookup", description: "Resolve a domain to its IP address" },
    { name: "Reverse DNS", description: "Find the hostname for an IP address" },
    { name: "MX Record Lookup", description: "Find mail exchange records for a domain" },
    { name: "TXT Record Lookup", description: "Retrieve TXT records for a domain" },
    { name: "WHOIS Lookup", description: "Get registration info for a domain" },
  ],
  port_monitor: [
    { name: "Check Port", description: "Test if a specific port is open on a host" },
    { name: "Scan Ports", description: "Scan a range of ports on a host" },
    { name: "Check Service", description: "Verify a named service is listening" },
  ],
  http_monitor: [
    { name: "Check Uptime", description: "Ping an endpoint and return its status code" },
    { name: "Measure Response Time", description: "Record the latency of an HTTP request" },
    { name: "Check Response Body", description: "Assert that a response contains expected text" },
    { name: "Assert Status Code", description: "Fail if the response code doesn't match" },
  ],

  // ── CRM & Commerce ────────────────────────────────────────────────────────────

  // ── Social Media ──────────────────────────────────────────────────────────────
  twitter: [
    { name: "Post Tweet", description: "Post a new tweet to your Twitter account" },
    { name: "Reply to Tweet", description: "Reply to an existing tweet" },
    { name: "Like Tweet", description: "Like a tweet by its ID" },
    { name: "Retweet", description: "Retweet a tweet to your followers" },
    { name: "Search Tweets", description: "Search recent tweets by keyword" },
    { name: "Follow User", description: "Follow a Twitter user by handle" },
    { name: "Get User Profile", description: "Fetch a user's profile and metrics" },
  ],
  mastodon: [
    { name: "Post Toot", description: "Publish a new toot to your Mastodon account" },
    { name: "Boost Toot", description: "Reblog (boost) a toot from another account" },
    { name: "Search Hashtag", description: "Find toots tagged with a hashtag" },
    { name: "Get Timeline", description: "Fetch the public or local timeline" },
  ],
  hackernews: [
    { name: "Get Top Stories", description: "Fetch the current top Hacker News stories" },
    { name: "Get New Stories", description: "Get the newest HN submissions" },
    { name: "Get Story Details", description: "Fetch title, URL, and score for a story" },
    { name: "Get Comments", description: "Fetch top-level comments on a story" },
  ],
  producthunt: [
    { name: "Get Today's Launches", description: "Fetch products launched today on Product Hunt" },
    { name: "Search Products", description: "Search Product Hunt by keyword or topic" },
    { name: "Get Product Details", description: "Fetch votes, description, and maker info" },
    { name: "Get Trending Posts", description: "Get currently trending products" },
  ],

  // ── Social Media Publishing ─────────────────────────────────────────────────
  youtube_upload: [
    { name: "Upload Video", description: "Upload a video file to YouTube" },
    { name: "Update Video Metadata", description: "Edit title, description, or tags" },
    { name: "Set Thumbnail", description: "Upload a custom thumbnail for a video" },
    { name: "Publish Video", description: "Change a private video to public" },
  ],
  instagram_post: [
    { name: "Create Photo Post", description: "Publish a photo with caption to Instagram" },
    { name: "Create Carousel Post", description: "Post a multi-image carousel" },
    { name: "Create Reel", description: "Publish a short video Reel to Instagram" },
    { name: "Schedule Post", description: "Schedule a post for a future time" },
  ],
  tiktok_post: [
    { name: "Upload Video", description: "Upload a TikTok video to your account" },
    { name: "Post with Caption", description: "Publish a video with hashtags and caption" },
    { name: "Schedule Post", description: "Schedule a TikTok post for later" },
  ],
  linkedin_post: [
    { name: "Create Text Post", description: "Post a text update on LinkedIn" },
    { name: "Create Image Post", description: "Share an image with a caption" },
    { name: "Create Article", description: "Publish a long-form LinkedIn article" },
    { name: "Share URL Post", description: "Share a URL with a preview card" },
  ],
  twitter_post: [
    { name: "Post Tweet", description: "Publish a tweet to your Twitter timeline" },
    { name: "Post Thread", description: "Publish a threaded series of tweets" },
    { name: "Schedule Tweet", description: "Schedule a tweet for a future time" },
    { name: "Post with Media", description: "Attach an image or video to a tweet" },
  ],
  rss_feed_generator: [
    { name: "Generate RSS Feed", description: "Create an RSS feed from structured data" },
    { name: "Add Feed Item", description: "Append a new item to an RSS feed" },
    { name: "Validate Feed", description: "Check that an RSS or Atom feed is well-formed" },
  ],
  blog_post: [
    { name: "Create Post", description: "Publish a blog post via the CMS API" },
    { name: "Update Post", description: "Edit an existing blog post" },
    { name: "Publish Draft", description: "Change a draft to published status" },
    { name: "Add Tag", description: "Tag a blog post with a category or keyword" },
  ],
  thumbnail_generator: [
    { name: "Generate Thumbnail", description: "Create a thumbnail image from a template" },
    { name: "Overlay Text on Image", description: "Add a title or caption to an image" },
    { name: "Resize Image", description: "Scale an image to target dimensions" },
    { name: "Add Logo Watermark", description: "Place a branded watermark on an image" },
  ],
  hashtag_suggester: [
    { name: "Suggest Hashtags", description: "Generate relevant hashtags for a post" },
    { name: "Get Trending Hashtags", description: "Find what's trending on a platform" },
    { name: "Analyze Hashtag Reach", description: "Estimate reach for a given hashtag" },
  ],
  caption_writer: [
    { name: "Write Caption", description: "Generate a social media caption with AI" },
    { name: "Rewrite Caption", description: "Improve an existing caption's engagement" },
    { name: "Add Call to Action", description: "Append a strong CTA to a caption" },
  ],
  audience_insights: [
    { name: "Analyze Audience Demographics", description: "Understand your audience age, location, and interests" },
    { name: "Best Posting Times", description: "Find optimal times to post based on engagement history" },
    { name: "Top Performing Content", description: "Identify which content drives the most engagement" },
  ],

  // ── Design & Creative ─────────────────────────────────────────────────────────
  image_generate: [
    { name: "Generate Image (DALL·E)", description: "Create an image from a text prompt via DALL·E" },
    { name: "Generate Image (Stable Diffusion)", description: "Create an image via Stability AI" },
    { name: "Generate Image (Midjourney)", description: "Create via Midjourney API" },
    { name: "Image Variation", description: "Create a variation of an existing image" },
    { name: "Edit Image (Inpainting)", description: "Edit part of an image with a masked region" },
  ],
  image_caption: [
    { name: "Describe Image", description: "Generate an alt-text description of an image" },
    { name: "Extract Text from Image (OCR)", description: "Read text from a photo or screenshot" },
    { name: "Classify Image", description: "Label what's depicted in an image" },
    { name: "Detect Objects", description: "Identify objects and their bounding boxes" },
  ],
  remove_background: [
    { name: "Remove Background", description: "Cut out the background from a product photo" },
    { name: "Replace Background", description: "Swap the background with a new color or image" },
    { name: "Cutout Foreground", description: "Extract the main subject as a PNG with transparency" },
  ],
  font_preview: [
    { name: "Render Font Preview", description: "Preview custom text in a specific font" },
    { name: "List Available Fonts", description: "Browse available fonts from Google Fonts" },
    { name: "Download Font", description: "Fetch a font file for use in a project" },
  ],
  figma_comment: [
    { name: "Add Comment to File", description: "Post a comment on a Figma design file" },
    { name: "Get Comments", description: "Fetch all comments on a Figma file" },
    { name: "Resolve Comment", description: "Mark a comment as resolved" },
    { name: "Get File Nodes", description: "Extract layers and frames from a Figma file" },
  ],
  canva_export: [
    { name: "Export Design", description: "Export a Canva design as PNG, PDF, or MP4" },
    { name: "Create Design from Template", description: "Instantiate a Canva template with custom text" },
    { name: "Update Design Text", description: "Replace placeholder text in a Canva design" },
  ],

  // ── Education & AI Tools ─────────────────────────────────────────────────────
  flashcard_generator: [
    { name: "Generate Flashcards", description: "Create question-answer pairs from text" },
    { name: "Generate from PDF", description: "Extract and create flashcards from a PDF" },
    { name: "Export to Anki", description: "Format flashcards for import into Anki" },
  ],
  quiz_generator: [
    { name: "Generate Multiple Choice", description: "Create MCQ questions from a topic or text" },
    { name: "Generate True/False", description: "Create T/F questions from content" },
    { name: "Grade Answers", description: "Evaluate student answers and provide feedback" },
    { name: "Generate Essay Prompts", description: "Create open-ended essay questions" },
  ],
  citation_formatter: [
    { name: "Format in APA", description: "Convert reference data to APA format" },
    { name: "Format in MLA", description: "Convert reference data to MLA format" },
    { name: "Format in Chicago", description: "Convert reference data to Chicago format" },
    { name: "Extract URL Metadata", description: "Pull title, author, and date from a URL" },
  ],
  grammar_check: [
    { name: "Check Grammar", description: "Find and fix grammar errors in text" },
    { name: "Check Spelling", description: "Detect misspelled words and suggest corrections" },
    { name: "Check Readability", description: "Score text readability with Flesch-Kincaid" },
    { name: "Check Plagiarism", description: "Check text against known sources" },
  ],
  summarize: [
    { name: "Summarize Text", description: "Condense a long text into key bullet points" },
    { name: "Executive Summary", description: "Write a 3-sentence executive summary" },
    { name: "Summarize URL", description: "Fetch and summarize the content at a URL" },
    { name: "Summarize PDF", description: "Extract and summarize a PDF document" },
    { name: "Abstractive Summary", description: "Generate a flowing summary paragraph" },
  ],
  translation: [
    { name: "Translate Text", description: "Translate text to a target language" },
    { name: "Detect Language", description: "Identify the language of a given text" },
    { name: "Batch Translate", description: "Translate an array of strings in one call" },
    { name: "Transliterate", description: "Convert text to phonetic script" },
  ],
  text_to_speech: [
    { name: "Convert to Audio", description: "Convert text to a speech audio file" },
    { name: "Generate Voiceover", description: "Create a narration with a selected voice" },
    { name: "SSML to Audio", description: "Use SSML markup for expressive speech" },
  ],
  speech_to_text: [
    { name: "Transcribe Audio", description: "Convert an audio file to a text transcript" },
    { name: "Live Transcription", description: "Transcribe a live audio stream" },
    { name: "Speaker Diarization", description: "Separate and label different speakers" },
    { name: "Transcribe with Timestamps", description: "Return word-level timestamps" },
  ],
  ocr: [
    { name: "Extract Text from Image", description: "Read printed or handwritten text from a photo" },
    { name: "Extract from PDF", description: "OCR a scanned PDF document" },
    { name: "Extract Table from Image", description: "Parse a photo of a table into structured data" },
    { name: "Extract from Screenshot", description: "Pull text from a UI screenshot" },
  ],

  // ── Text Formatting ───────────────────────────────────────────────────────────
  number_format: [
    { name: "Format Currency", description: "Format a number as a currency string" },
    { name: "Format Percentage", description: "Convert a decimal to a percentage display" },
    { name: "Round to Decimal", description: "Round a number to N decimal places" },
    { name: "Add Thousands Separator", description: "Format large numbers with commas" },
  ],
  find_replace: [
    { name: "Find & Replace", description: "Replace all occurrences of a string" },
    { name: "Case-insensitive Replace", description: "Replace text regardless of case" },
    { name: "Replace with Regex", description: "Use a regex pattern for advanced replacement" },
  ],
  html_to_text: [
    { name: "Strip HTML Tags", description: "Remove all HTML markup from a string" },
    { name: "HTML to Markdown", description: "Convert HTML content to Markdown" },
    { name: "Parse HTML Links", description: "Extract all anchor tags and URLs from HTML" },
    { name: "Sanitize HTML", description: "Remove dangerous tags while keeping safe markup" },
  ],
  json_to_csv: [
    { name: "JSON Array to CSV", description: "Convert a JSON array of objects to CSV" },
    { name: "CSV to JSON", description: "Convert CSV text back to a JSON array" },
    { name: "Flatten Nested JSON", description: "Convert nested objects to flat CSV rows" },
  ],
  xml_parser: [
    { name: "Parse XML to JSON", description: "Convert an XML string to a JSON object" },
    { name: "JSON to XML", description: "Convert a JSON object to XML markup" },
    { name: "XPath Query", description: "Extract nodes from XML using an XPath expression" },
    { name: "Validate XML", description: "Check if an XML document is well-formed" },
  ],
  markdown_renderer: [
    { name: "Render Markdown to HTML", description: "Convert Markdown to HTML markup" },
    { name: "Render to Plain Text", description: "Strip Markdown syntax to plain text" },
    { name: "Extract Headings", description: "Pull all heading text from a Markdown document" },
    { name: "Extract Links", description: "Find all links in a Markdown document" },
  ],

  // ── Finance & Accounting ──────────────────────────────────────────────────────
  gst_calculator: [
    { name: "Calculate GST", description: "Compute GST amount and total for a given rate" },
    { name: "Reverse GST Calculation", description: "Extract GST from a GST-inclusive price" },
    { name: "Generate GST Invoice", description: "Format a GST-compliant invoice summary" },
  ],
  invoice_parser: [
    { name: "Parse Invoice PDF", description: "Extract line items, totals, and vendor from a PDF" },
    { name: "Extract Invoice Fields", description: "Pull date, amount, and reference from text" },
    { name: "Validate Invoice Format", description: "Check that an invoice has all required fields" },
  ],
  tax_rate_lookup: [
    { name: "Get Tax Rate by Country", description: "Look up VAT/GST rate for a given country" },
    { name: "Get Sales Tax by US State", description: "Look up state-specific sales tax rate" },
    { name: "Check Tax Exemptions", description: "Determine if a category is tax-exempt" },
  ],
  bank_statement_parser: [
    { name: "Parse OFX/QFX File", description: "Extract transactions from a bank export" },
    { name: "Categorize Transactions", description: "Auto-label transactions by merchant type" },
    { name: "Generate Spending Summary", description: "Summarize total spend by category" },
  ],
  ledger_entry: [
    { name: "Create Journal Entry", description: "Record a debit/credit pair in the ledger" },
    { name: "Get Account Balance", description: "Fetch the current balance for an account" },
    { name: "List Transactions", description: "Query transactions for a date range" },
    { name: "Reconcile Account", description: "Match transactions against a bank statement" },
  ],
  currency_exchange: [
    { name: "Convert Currency", description: "Convert an amount from one currency to another" },
    { name: "Get Exchange Rate", description: "Fetch the live exchange rate between two currencies" },
    { name: "List Available Currencies", description: "Return all supported currency codes" },
    { name: "Historical Rate Lookup", description: "Get the exchange rate on a specific past date" },
  ],
  compound_interest: [
    { name: "Calculate Compound Interest", description: "Compute future value with compound interest" },
    { name: "Loan Amortization", description: "Generate a full loan repayment schedule" },
    { name: "Break-even Calculator", description: "Find the point where revenue equals cost" },
  ],
  payroll_calculator: [
    { name: "Calculate Net Pay", description: "Compute take-home pay after deductions" },
    { name: "Calculate Tax Withholding", description: "Estimate income tax withheld per paycheck" },
    { name: "Generate Pay Stub", description: "Format a structured pay stub object" },
  ],

  // ── Gaming ─────────────────────────────────────────────────────────────────────
  steam_game_lookup: [
    { name: "Get Game Info", description: "Fetch title, price, and metadata from Steam" },
    { name: "Get Player Stats", description: "Look up a player's Steam achievements and hours" },
    { name: "Search Games", description: "Find games on Steam by keyword" },
    { name: "Get Price History", description: "Fetch historical pricing for a Steam game" },
  ],
  twitch_stream_status: [
    { name: "Check Stream Live", description: "Check if a Twitch streamer is currently live" },
    { name: "Get Stream Info", description: "Fetch title, game, and viewer count" },
    { name: "Get Top Streams", description: "List the most-watched live streams" },
    { name: "Search Channels", description: "Find Twitch channels matching a query" },
  ],
  discord_role_assign: [
    { name: "Assign Role", description: "Give a Discord member a specific role" },
    { name: "Remove Role", description: "Take away a role from a Discord member" },
    { name: "List User Roles", description: "Fetch all roles for a Discord member" },
    { name: "Create Role", description: "Create a new role in a Discord server" },
  ],
  leaderboard_update: [
    { name: "Add Score", description: "Submit a score for a player" },
    { name: "Get Top N", description: "Fetch the top N scores on the leaderboard" },
    { name: "Get Player Rank", description: "Find a specific player's rank and score" },
    { name: "Reset Leaderboard", description: "Clear all scores for a new season" },
  ],
  game_event_webhook: [
    { name: "Emit Game Event", description: "Publish a game event to the webhook endpoint" },
    { name: "Listen for Event", description: "Register to receive game events" },
    { name: "Filter Event Type", description: "Only process events of a specific type" },
  ],

  // ── Automation Utilities ──────────────────────────────────────────────────────
  schedule_check: [
    { name: "Check Business Hours", description: "Return whether the current time is within business hours" },
    { name: "Is Weekend", description: "Check if today is a Saturday or Sunday" },
    { name: "Is Holiday", description: "Check if today is a public holiday" },
    { name: "Next Business Day", description: "Calculate the next working day" },
  ],
  ip_whitelist: [
    { name: "Check IP in Whitelist", description: "Allow or block a request based on its IP" },
    { name: "Add IP to Whitelist", description: "Add a trusted IP address to the list" },
    { name: "Remove IP from Whitelist", description: "Remove an IP from the trusted list" },
  ],
  pagination_handler: [
    { name: "Auto-paginate API", description: "Automatically fetch all pages of an API response" },
    { name: "Cursor-based Pagination", description: "Follow cursor tokens for paginated APIs" },
    { name: "Offset-based Pagination", description: "Increment page offset to collect all results" },
  ],
  file_upload: [
    { name: "Upload to S3", description: "Upload a file to an AWS S3 bucket" },
    { name: "Upload to GCS", description: "Upload a file to Google Cloud Storage" },
    { name: "Upload to Cloudinary", description: "Upload media to Cloudinary CDN" },
    { name: "Upload to R2", description: "Upload a file to Cloudflare R2" },
  ],
  file_download: [
    { name: "Download from URL", description: "Fetch a file from a public URL" },
    { name: "Download from S3", description: "Download a file from an AWS S3 bucket" },
    { name: "Download from GCS", description: "Download a file from Google Cloud Storage" },
  ],
  zip_files: [
    { name: "Create ZIP Archive", description: "Compress multiple files into a ZIP" },
    { name: "Extract ZIP", description: "Unzip a ZIP archive and list its contents" },
    { name: "Add File to ZIP", description: "Append a file to an existing ZIP archive" },
  ],
  hash: [
    { name: "SHA-256 Hash", description: "Compute the SHA-256 hash of any string" },
    { name: "MD5 Hash", description: "Compute the MD5 hash of a string" },
    { name: "bcrypt Hash", description: "Hash a password with bcrypt for secure storage" },
    { name: "bcrypt Verify", description: "Verify a password against a bcrypt hash" },
  ],
  virustotal: [
    { name: "Scan URL", description: "Submit a URL to VirusTotal for analysis" },
    { name: "Scan File Hash", description: "Check a file hash against known malware" },
    { name: "Get Report", description: "Fetch the analysis report for a submitted file or URL" },
    { name: "Search IOCs", description: "Search VirusTotal for indicators of compromise" },
  ],

  // ── Google Workspace ──────────────────────────────────────────────────────────

  // ── Misc / Monitoring ────────────────────────────────────────────────────────
  rss: [
    { name: "Fetch RSS Feed", description: "Parse and return items from an RSS feed URL" },
    { name: "Get Latest Item", description: "Return only the most recent feed item" },
    { name: "Search Feed Items", description: "Filter feed items by keyword" },
    { name: "Subscribe to Feed", description: "Watch an RSS feed for new items" },
  ],
  price_alert: [
    { name: "Check Price Drop", description: "Check if a product's price fell below a threshold" },
    { name: "Check Price Rise", description: "Alert when a price exceeds a target" },
    { name: "Track Historical Price", description: "Log the current price for trend analysis" },
  ],
  cron: [
    { name: "Run on Schedule", description: "Execute on a cron schedule (e.g. every hour)" },
    { name: "Run Daily at Time", description: "Execute every day at a specific time" },
    { name: "Run Weekly", description: "Execute once a week on a specific day" },
  ],
  chat: [
    { name: "Reply to User", description: "Send a reply in the chat interface" },
    { name: "Ask a Question", description: "Ask the user a follow-up question" },
    { name: "Display Structured Data", description: "Show a formatted table or card to the user" },
  ],

  // ── Apps (blue in-panel action dropdown) ─────────────────────────────────────
};

export const NODE_ACTIONS = { ...BUILTIN_ACTIONS, ...APP_ACTIONS, ...DB_ACTIONS, ...DATA_ACTIONS };
