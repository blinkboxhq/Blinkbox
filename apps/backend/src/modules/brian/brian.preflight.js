function hasBrianAskedBuilderQuestions(messages = []) {
  return messages.slice(0, -1).some((m) => {
    if (m.role !== "assistant") return false;
    const text = String(m.content || m.text || "").toLowerCase();
    return text.includes("agent build brief") || text.includes("memory provider") || text.includes("credential setup");
  });
}

export function buildBrianPreflightQuestions(messages = [], userText = "") {
  if (hasBrianAskedBuilderQuestions(messages)) return null;

  const text = String(userText || "").toLowerCase();
  const wantsAgent = /\b(agent|assistant|chatbot|rag)\b/.test(text);
  const wantsRag = /\b(rag|knowledge\s*base|documents?|memory|vector)\b/.test(text);
  const wantsGoogle = /\ball\s+(the\s+)?google|google integrations|gmail|google calendar|calendar|google sheets|sheets|google drive|drive/.test(text);
  const wantsClaude = /\bclaude|anthropic|cheap|cheaper|lowest-cost|low cost\b/.test(text);

  if (!wantsAgent) return null;

  const questions = [
    {
      id: "agent_goal",
      question: "What should the agent optimize for?",
      options: [
        { label: "Answer questions", value: "qa_agent", hint: "Chat-first assistant" },
        { label: "Research and summarize", value: "research_agent", hint: "Gather and cite context" },
        { label: "Operate Google apps", value: "google_operator", hint: "Read and update Workspace" },
        { label: "Support workflow", value: "support_agent", hint: "Triage and respond" },
      ],
    },
    {
      id: "entrypoint",
      question: "How should users talk to this agent?",
      options: [
        { label: "Chat", value: "chat_trigger", hint: "Recommended for agents" },
        { label: "Gmail", value: "gmail_trigger", hint: "Incoming email starts it" },
        { label: "Schedule", value: "cron_trigger", hint: "Runs on a cadence" },
        { label: "Webhook", value: "webhook", hint: "API or app event" },
      ],
    },
    {
      id: "model_choice",
      question: "Which model profile should power it?",
      options: [
        { label: "Cheap Claude", value: "anthropic_haiku", hint: "Claude Haiku" },
        { label: "Balanced Claude", value: "anthropic_sonnet", hint: "Claude Sonnet" },
        { label: "OpenAI", value: "openai", hint: "GPT model node" },
        { label: "Gemini", value: "gemini", hint: "Google model node" },
      ],
    },
    {
      id: "memory_provider",
      question: "Which memory provider should power the RAG knowledge base?",
      options: [
        { label: wantsRag ? "Pinecone" : "No memory", value: wantsRag ? "agent_memory_pinecone" : "none", hint: wantsRag ? "Recommended vector memory" : "Skip RAG memory" },
        { label: "Pinecone", value: "agent_memory_pinecone", hint: "Vector RAG memory" },
        { label: "Supabase", value: "agent_memory_supabase", hint: "Use if preferred" },
        { label: "Postgres", value: "agent_memory_postgres", hint: "SQL-backed memory" },
      ],
    },
    {
      id: "credential_setup",
      question: "When is the workflow allowed onto the canvas?",
      options: [
        { label: "After config", value: "complete_before_apply", hint: "Recommended strict mode" },
        { label: "Use existing creds", value: "use_existing", hint: "Auto-fill if available" },
        { label: "Ask me in plan", value: "pick_in_plan", hint: "Credential checklist" },
      ],
    },
  ];

  return {
    intro: `Agent build brief: answer these 5 points, then I will build the workflow from those choices.${wantsGoogle ? " I will include the Google integrations you named." : ""}${wantsClaude ? " I will map cheap Claude to Haiku." : ""}`,
    questions,
  };
}
