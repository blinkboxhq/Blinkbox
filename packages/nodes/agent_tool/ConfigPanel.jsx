import { useState } from "react";
import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";

// ─── All tool definitions ────────────────────────────────────────────────────

const TOOLS = [
  // Search & Web
  {
    id: "web_search",
    label: "Web Search",
    icon: "🔍",
    color: "#f97316",
    category: "Web",
    desc: "Search the internet in real-time",
    fields: [
      { key: "searchEngine", label: "Search Engine", type: "select", options: ["google","bing","duckduckgo","brave"], default: "google" },
      { key: "maxResults", label: "Max Results", type: "select", options: [3,5,10,20], default: 5 },
      { key: "safeSearch", label: "Safe Search", type: "toggle", default: true },
      { key: "credentialId", label: "API Key", type: "credential", accentColor: "orange" },
    ],
  },
  {
    id: "http_request",
    label: "HTTP Request",
    icon: "🌐",
    color: "#3b82f6",
    category: "Web",
    desc: "Call any external API or webhook",
    fields: [
      { key: "method", label: "Method", type: "select", options: ["GET","POST","PUT","PATCH","DELETE"], default: "GET" },
      { key: "url", label: "URL", type: "smartvar", placeholder: "https://api.example.com/{{ $json.id }}" },
      { key: "headers", label: "Headers (JSON)", type: "smartvar", placeholder: '{"Authorization":"Bearer {{ $json.token }}"}' },
      { key: "body", label: "Body (JSON)", type: "smartvar", placeholder: '{"key":"{{ $json.value }}"}', showWhen: { key: "method", not: "GET" } },
    ],
  },
  {
    id: "web_scraper",
    label: "Web Scraper",
    icon: "🕷",
    color: "#10b981",
    category: "Web",
    desc: "Extract content from any webpage",
    fields: [
      { key: "url", label: "URL to Scrape", type: "smartvar", placeholder: "https://example.com" },
      { key: "selector", label: "CSS Selector (optional)", type: "smartvar", placeholder: "h1, .content, #main" },
      { key: "returnType", label: "Return As", type: "select", options: ["text","html","markdown"], default: "text" },
      { key: "waitForJs", label: "Wait for JavaScript", type: "toggle", default: false },
    ],
  },

  // Data & Computation
  {
    id: "math_calculator",
    label: "Calculator",
    icon: "🔢",
    color: "#10b981",
    category: "Data",
    desc: "Evaluate math expressions precisely",
    fields: [
      { key: "precision", label: "Decimal Precision", type: "select", options: [2,4,6,8,10], default: 4 },
      { key: "allowComplex", label: "Allow Complex Numbers", type: "toggle", default: false },
    ],
  },
  {
    id: "data_extractor",
    label: "Data Extractor",
    icon: "📦",
    color: "#06b6d4",
    category: "Data",
    desc: "Parse and extract structured data from JSON",
    fields: [
      { key: "schema", label: "Output Schema (JSON)", type: "smartvar", placeholder: '{"name":"string","age":"number"}' },
      { key: "strict", label: "Strict Mode (fail on missing)", type: "toggle", default: false },
    ],
  },
  {
    id: "code_runner",
    label: "Code Runner",
    icon: "💻",
    color: "#a3e635",
    category: "Data",
    desc: "Execute JavaScript code safely in a sandbox",
    fields: [
      { key: "code", label: "JavaScript Code", type: "code", placeholder: "// return value becomes tool output\nreturn { result: input.value * 2 };" },
      { key: "timeout", label: "Timeout (ms)", type: "select", options: [1000,3000,5000,10000], default: 3000 },
    ],
  },

  // Knowledge & Research
  {
    id: "datetime",
    label: "Date & Time",
    icon: "🕐",
    color: "#f59e0b",
    category: "Knowledge",
    desc: "Get current date, time, and timezone info",
    fields: [
      { key: "timezone", label: "Timezone", type: "smartvar", placeholder: "UTC  or  America/New_York" },
      { key: "format", label: "Date Format", type: "select", options: ["ISO8601","locale","unix","relative"], default: "ISO8601" },
    ],
  },
  {
    id: "think",
    label: "Reasoning Scratchpad",
    icon: "🧠",
    color: "#8b5cf6",
    category: "Knowledge",
    desc: "Step-by-step reasoning space before answering",
    fields: [
      { key: "maxSteps", label: "Max Reasoning Steps", type: "select", options: [3,5,10,20], default: 5 },
      { key: "exposeSteps", label: "Include Steps in Output", type: "toggle", default: false },
    ],
  },
  {
    id: "knowledge_base",
    label: "Knowledge Base",
    icon: "📚",
    color: "#6366f1",
    category: "Knowledge",
    desc: "Search a document collection via semantic similarity",
    fields: [
      { key: "collection", label: "Collection Name", type: "smartvar", placeholder: "company-docs" },
      { key: "topK", label: "Results to Return", type: "select", options: [1,3,5,10], default: 3 },
      { key: "threshold", label: "Min Similarity Score", type: "select", options: [0.5,0.6,0.7,0.8,0.9], default: 0.7 },
      { key: "credentialId", label: "Vector DB Credential", type: "credential", accentColor: "indigo" },
    ],
  },

  // Communication
  {
    id: "send_email",
    label: "Send Email",
    icon: "📧",
    color: "#ef4444",
    category: "Comms",
    desc: "Send an email on behalf of the agent",
    fields: [
      { key: "to", label: "To", type: "smartvar", placeholder: "{{ $json.email }}" },
      { key: "subject", label: "Subject", type: "smartvar", placeholder: "{{ generated by agent }}" },
      { key: "provider", label: "Provider", type: "select", options: ["smtp","sendgrid","resend"], default: "smtp" },
      { key: "credentialId", label: "Email Credential", type: "credential", accentColor: "red" },
    ],
  },
  {
    id: "send_slack",
    label: "Slack Message",
    icon: "💬",
    color: "#E01E5A",
    category: "Comms",
    desc: "Post a message to a Slack channel",
    fields: [
      { key: "channel", label: "Channel", type: "smartvar", placeholder: "#alerts or C01ABCDEF" },
      { key: "credentialId", label: "Slack Bot Token", type: "credential", accentColor: "pink" },
    ],
  },
  {
    id: "create_calendar_event",
    label: "Calendar Event",
    icon: "📅",
    color: "#4285F4",
    category: "Comms",
    desc: "Create a Google Calendar event",
    fields: [
      { key: "calendarId", label: "Calendar ID", type: "smartvar", placeholder: "primary" },
      { key: "credentialId", label: "Google OAuth", type: "credential", accentColor: "blue" },
    ],
  },

  // Storage
  {
    id: "read_file",
    label: "Read File",
    icon: "📂",
    color: "#64748b",
    category: "Storage",
    desc: "Read a file from S3, GCS, or local storage",
    fields: [
      { key: "path", label: "File Path or URL", type: "smartvar", placeholder: "s3://my-bucket/file.txt" },
      { key: "encoding", label: "Encoding", type: "select", options: ["utf8","base64","binary"], default: "utf8" },
    ],
  },
  {
    id: "write_file",
    label: "Write File",
    icon: "💾",
    color: "#64748b",
    category: "Storage",
    desc: "Write or append data to a file",
    fields: [
      { key: "path", label: "Destination Path", type: "smartvar", placeholder: "s3://my-bucket/{{ $json.filename }}" },
      { key: "mode", label: "Write Mode", type: "select", options: ["overwrite","append"], default: "overwrite" },
    ],
  },
  {
    id: "database_query",
    label: "SQL Query",
    icon: "🗄",
    color: "#5B9BD5",
    category: "Storage",
    desc: "Run a read-only SQL query against a database",
    fields: [
      { key: "query", label: "SQL Query", type: "smartvar", placeholder: "SELECT * FROM users WHERE id = {{ $json.userId }}" },
      { key: "dbType", label: "Database", type: "select", options: ["postgres","mysql","sqlite"], default: "postgres" },
      { key: "credentialId", label: "DB Credential", type: "credential", accentColor: "blue" },
    ],
  },
];

const CATEGORIES = [...new Set(TOOLS.map(t => t.category))];

// ─── Field renderer ─────────────────────────────────────────────────────────

function Field({ field, config, updateConfig, nodeId }) {
  if (field.showWhen) {
    const v = config[field.showWhen.key];
    if (field.showWhen.not && v === field.showWhen.not) return null;
    if (field.showWhen.is && v !== field.showWhen.is) return null;
  }

  const label = (
    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">
      {field.label}
    </label>
  );

  if (field.type === "smartvar") {
    return (
      <div key={field.key}>
        {label}
        <SmartVariableInput value={config[field.key] || ""} onChange={v => updateConfig(field.key, v)} placeholder={field.placeholder} nodeId={nodeId} />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div key={field.key}>
        {label}
        <div className="flex gap-1.5 flex-wrap">
          {field.options.map(o => (
            <button key={o} onClick={() => updateConfig(field.key, o)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                (config[field.key] ?? field.default) === o
                  ? "bg-zinc-700/60 border-zinc-600 text-zinc-100"
                  : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700"
              }`}>
              {String(o)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "toggle") {
    const val = config[field.key] ?? field.default ?? false;
    return (
      <div key={field.key} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
        <p className="text-[11px] font-semibold text-zinc-300">{field.label}</p>
        <button onClick={() => updateConfig(field.key, !val)}
          className={`relative w-9 h-5 rounded-full transition-all duration-200 shrink-0 ${val ? "bg-violet-500" : "bg-zinc-700"}`}>
          <span className={`absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${val ? "translate-x-4" : "translate-x-0"}`} />
        </button>
      </div>
    );
  }

  if (field.type === "credential") {
    return (
      <div key={field.key}>
        <CredentialPicker
          value={config[field.key] || ""}
          onChange={id => updateConfig(field.key, id)}
          accentColor={field.accentColor || "violet"}
          label={field.label}
          placeholder={`Select credential…`}
        />
      </div>
    );
  }

  if (field.type === "code") {
    return (
      <div key={field.key}>
        {label}
        <textarea
          value={config[field.key] || ""}
          onChange={e => updateConfig(field.key, e.target.value)}
          placeholder={field.placeholder}
          rows={5}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-600 resize-none transition-colors"
        />
      </div>
    );
  }

  return null;
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AgentToolNode({ config = {}, updateConfig, nodeId }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const selectedId = config.toolId;
  const selectedTool = TOOLS.find(t => t.id === selectedId);

  const filtered = TOOLS.filter(t => {
    if (activeCategory !== "all" && t.category !== activeCategory) return false;
    if (search && !t.label.toLowerCase().includes(search.toLowerCase()) && !t.desc.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (selectedTool) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {/* Tool header with back button */}
        <div className="flex items-center gap-2.5">
          <button onClick={() => updateConfig("toolId", undefined)}
            className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors shrink-0">
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-base leading-none">{selectedTool.icon}</span>
            <div>
              <p className="text-[12px] font-bold text-zinc-100">{selectedTool.label}</p>
              <p className="text-[9px] text-zinc-600">{selectedTool.desc}</p>
            </div>
          </div>
          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border"
            style={{ color: selectedTool.color, borderColor: selectedTool.color + "40", background: selectedTool.color + "12" }}>
            {selectedTool.category}
          </span>
        </div>

        {/* Tool name for the agent */}
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Tool Name (shown to agent)</label>
          <input
            value={config.toolName || selectedTool.label}
            onChange={e => updateConfig("toolName", e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[12px] text-zinc-200 font-mono focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Tool description for the agent */}
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Description (tells agent when to use it)</label>
          <textarea
            value={config.toolDesc || selectedTool.desc}
            onChange={e => updateConfig("toolDesc", e.target.value)}
            rows={2}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[11px] text-zinc-400 focus:outline-none focus:border-zinc-600 resize-none transition-colors"
          />
        </div>

        {/* Dynamic fields */}
        {selectedTool.fields.map(field => (
          <Field key={field.key} field={field} config={config} updateConfig={updateConfig} nodeId={nodeId} />
        ))}

        <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-600">
          Connect the <span className="text-zinc-400 font-semibold">output</span> of this node to a <span className="text-orange-400 font-semibold">Tool</span> slot on the AI Agent.
        </div>
      </div>
    );
  }

  // Tool browser
  return (
    <div className="flex flex-col gap-3 p-4">
      <div>
        <p className="text-[12px] font-bold text-zinc-100 mb-0.5">Select a Tool</p>
        <p className="text-[10px] text-zinc-600">The agent will decide when to call this tool.</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl focus-within:border-zinc-600 transition-colors">
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-zinc-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 2.5 2.5" strokeLinecap="round" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tools…"
          className="flex-1 bg-transparent text-[11px] text-zinc-300 outline-none placeholder:text-zinc-700"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {["all", ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setActiveCategory(c)}
            className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${
              activeCategory === c
                ? "bg-zinc-700 border-zinc-600 text-zinc-100"
                : "bg-transparent border-zinc-800 text-zinc-600 hover:border-zinc-700"
            }`}>
            {c}
          </button>
        ))}
      </div>

      {/* Tool list */}
      <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
        {filtered.map(tool => (
          <button key={tool.id} onClick={() => updateConfig("toolId", tool.id)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-zinc-800/60 bg-zinc-950 hover:bg-zinc-900 hover:border-zinc-700 transition-all text-left group">
            <span className="text-base leading-none shrink-0">{tool.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">{tool.label}</p>
              <p className="text-[9px] text-zinc-700 truncate">{tool.desc}</p>
            </div>
            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0"
              style={{ color: tool.color, borderColor: tool.color + "30", background: tool.color + "10" }}>
              {tool.category}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-[11px] text-zinc-600 text-center py-6">No tools match "{search}"</p>
        )}
      </div>
    </div>
  );
}
