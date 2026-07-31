// Brian's agent build brief. This runs BEFORE the LLM and, when it returns a
// brief, short-circuits the whole chat — the user's prompt never reaches the
// model at all. So every answer this file fails to detect is a question the
// user gets asked again no matter how precisely they already answered it. It
// has to read the prompt for answers, not just sniff it for "is this an agent".

const NEGATORS =
  /\b(not|no|never|avoid|without|except|excludes?|excluded|excluding|rather than|instead of|don'?t|do not|skip|none)\b/;

// Answers arrive as prose ("NVIDIA NIM specifically, not Claude, not OpenAI").
// Matching the whole string would read that as a request for all four models,
// so match clause by clause and drop the negated ones.
function clauses(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[,;.\n!?]+|\bbut\b|\brather than\b|\binstead of\b/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function affirms(text, re) {
  return clauses(text).some((c) => re.test(c) && !NEGATORS.test(c));
}

function mentions(text, re) {
  return re.test(String(text || "").toLowerCase());
}

// "No memory", "memory: none" — a negated memory clause is itself the answer,
// so it can't go through affirms().
function declinesMemory(text) {
  return clauses(text).some(
    (c) =>
      /\b(memory|rag|knowledge\s*base|vector)\b/.test(c) &&
      /\b(none|no|not|without|skip|don'?t|do not|n\/a)\b/.test(c),
  );
}

const QUESTIONS = [
  {
    id: "agent_goal",
    question: "What should the agent optimize for?",
    options: [
      { label: "Answer questions", value: "qa_agent", hint: "Chat-first assistant" },
      { label: "Research and summarize", value: "research_agent", hint: "Gather and cite context" },
      { label: "Operate Google apps", value: "google_operator", hint: "Read and update Workspace" },
      { label: "Support workflow", value: "support_agent", hint: "Triage and respond" },
    ],
    detect: (t) => {
      if (affirms(t, /\b(research|summari[sz]e|scrape|extract|enrich|leads?|prospect|gather|find companies)\b/))
        return "research_agent";
      if (affirms(t, /\b(support|triage|ticket|helpdesk|customer service)\b/)) return "support_agent";
      if (affirms(t, /\b(sheets?|gmail|drive|calendar|google docs|workspace|google (integrations?|apps?))\b/))
        return "google_operator";
      if (affirms(t, /\b(answer questions?|q&a|faq|knowledge base)\b/)) return "qa_agent";
      return null;
    },
  },
  {
    id: "entrypoint",
    question: "How should users talk to this agent?",
    options: [
      { label: "Chat", value: "chat_trigger", hint: "Recommended for agents" },
      { label: "Manual", value: "manual", hint: "You press Run and fill in the inputs" },
      { label: "Gmail", value: "gmail_trigger", hint: "Incoming email starts it" },
      { label: "Schedule", value: "cron_trigger", hint: "Runs on a cadence" },
      { label: "Webhook", value: "webhook", hint: "API or app event" },
    ],
    detect: (t) => {
      if (affirms(t, /\bmanual(ly)?\b|\bpress run\b|\brun it myself\b|\bon[- ]demand\b/)) return "manual";
      if (affirms(t, /\bchat\b|\bconversation(al)?\b|\btalk to it\b/)) return "chat_trigger";
      if (affirms(t, /\bgmail\b|\bincoming email\b|\bwhen an email\b/)) return "gmail_trigger";
      if (affirms(t, /\b(schedule[dsr]?|cron|daily|hourly|weekly|every (day|hour|week|morning))\b/))
        return "cron_trigger";
      if (affirms(t, /\bwebhook\b|\bapi call\b/)) return "webhook";
      return null;
    },
  },
  {
    id: "model_choice",
    question: "Which model profile should power it?",
    options: [
      { label: "Cheap Claude", value: "anthropic_haiku", hint: "Claude Haiku" },
      { label: "Balanced Claude", value: "anthropic_sonnet", hint: "Claude Sonnet" },
      { label: "OpenAI", value: "openai", hint: "GPT model node" },
      { label: "Gemini", value: "gemini", hint: "Google model node" },
      { label: "NVIDIA NIM", value: "agent_nvidia_nim", hint: "NVIDIA NIM model node" },
    ],
    detect: (t) => {
      if (affirms(t, /\bnvidia\b|\bnim\b/)) return "agent_nvidia_nim";
      if (affirms(t, /\bhaiku\b/)) return "anthropic_haiku";
      if (affirms(t, /\bsonnet\b|\bopus\b/)) return "anthropic_sonnet";
      if (
        affirms(t, /\b(cheap(er|est)?|budget|low[- ]?cost|lowest[- ]?cost)\b/) &&
        affirms(t, /\bclaude\b|\banthropic\b/)
      )
        return "anthropic_haiku";
      if (affirms(t, /\bclaude\b|\banthropic\b/)) return "anthropic_sonnet";
      if (affirms(t, /\bopenai\b|\bgpt\b/)) return "openai";
      if (affirms(t, /\bgemini\b/)) return "gemini";
      return null;
    },
  },
  {
    id: "memory_provider",
    question: "Which memory provider should power the RAG knowledge base?",
    // Guessing here silently provisions a vector store the user may have no
    // account for, so an unanswered memory question is worth asking about on its
    // own — detect() only leaves it unanswered when the prompt asked for RAG
    // without naming a provider.
    blocking: true,
    options: [
      { label: "No memory", value: "none", hint: "Skip RAG memory" },
      { label: "Pinecone", value: "agent_memory_pinecone", hint: "Recommended vector memory" },
      { label: "Supabase", value: "agent_memory_supabase", hint: "Use if preferred" },
      { label: "Postgres", value: "agent_memory_postgres", hint: "SQL-backed memory" },
    ],
    detect: (t) => {
      if (affirms(t, /\bpinecone\b/)) return "agent_memory_pinecone";
      if (affirms(t, /\bsupabase\b/)) return "agent_memory_supabase";
      if (affirms(t, /\bpostgres(ql)?\b/)) return "agent_memory_postgres";
      if (affirms(t, /\bredis\b/)) return "agent_memory_redis";
      if (declinesMemory(t)) return "none";
      // A workflow that never mentions RAG, recall, or a knowledge base isn't
      // asking for one. Asking anyway is how a one-shot pipeline ends up being
      // interrogated about vector stores it will never use.
      if (!mentions(t, /\b(rag|knowledge\s*base|vector|memory|remember|recall|embed)\b/)) return "none";
      return null;
    },
  },
  {
    id: "credential_setup",
    question: "When is the workflow allowed onto the canvas?",
    options: [
      { label: "After config", value: "complete_before_apply", hint: "Recommended strict mode" },
      { label: "Use existing creds", value: "use_existing", hint: "Auto-fill if available" },
      { label: "Ask me in plan", value: "pick_in_plan", hint: "Credential checklist" },
    ],
    detect: (t) => {
      if (affirms(t, /\bexisting cred|already connected|saved cred|auto[- ]?fill\b/)) return "use_existing";
      if (affirms(t, /\bafter config|fully configured|complete before|strict mode\b/)) return "complete_before_apply";
      if (affirms(t, /\bask me\b|\bin the plan\b|\bchecklist\b/)) return "pick_in_plan";
      return null;
    },
  },
];

// Asking twice is the bug users actually feel, so treat any prior brief — the
// intro text or a stored questions payload — as "already asked".
function hasBrianAskedBuilderQuestions(messages = []) {
  return messages.slice(0, -1).some((m) => {
    if (m.role !== "assistant") return false;
    if (Array.isArray(m.questions) && m.questions.length) return true;
    const text = String(m.content || m.text || "").toLowerCase();
    return (
      text.includes("agent build brief") ||
      text.includes("build brief") ||
      text.includes("memory provider") ||
      text.includes("credential setup")
    );
  });
}

// Below this many unanswered points the prompt is specific enough to build from
// — the model fills the rest from its own defaults — unless one of the gaps is
// marked blocking. Re-asking a user who already told us four of five things is
// what turned this into a loop.
const ASK_THRESHOLD = 3;

export function buildBrianPreflightQuestions(messages = [], userText = "") {
  if (hasBrianAskedBuilderQuestions(messages)) return null;

  const text = String(userText || "");
  if (!affirms(text, /\b(agent|assistant|chatbot|rag)\b/)) return null;

  const answers = {};
  const missing = [];
  for (const q of QUESTIONS) {
    const hit = q.detect(text);
    if (hit) answers[q.id] = hit;
    else missing.push(q);
  }

  if (missing.length < ASK_THRESHOLD && !missing.some((q) => q.blocking)) return null;

  const googleApps = ["gmail", "google sheets", "google calendar", "google drive"].filter((app) =>
    affirms(text, new RegExp(`\\b${app}\\b`)),
  );

  const notes = [];
  if (googleApps.length) notes.push(` I will include the Google integrations you named (${googleApps.join(", ")}).`);
  // Only when cheap Claude is what they actually picked — the old check fired on
  // the bare word "claude", so "not Claude" promised Haiku.
  if (answers.model_choice === "anthropic_haiku") notes.push(" I will map cheap Claude to Haiku.");

  const answered = Object.entries(answers)
    .map(([id, value]) => {
      const q = QUESTIONS.find((x) => x.id === id);
      const opt = q?.options.find((o) => o.value === value);
      return opt ? `${q.question} → ${opt.label}` : null;
    })
    .filter(Boolean);

  const got = answered.length
    ? ` I already have: ${answered.join("; ")}.`
    : "";

  return {
    intro:
      `Agent build brief: answer these ${missing.length} point(s), then I will build the workflow from those choices.` +
      `${got}${notes.join("")}`,
    questions: missing.map(({ id, question, options }) => ({ id, question, options })),
  };
}
