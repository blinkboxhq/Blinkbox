function hasBrianAskedBuilderQuestions(messages = []) {
  return messages.slice(0, -1).some((m) => {
    if (m.role !== "assistant") return false;
    const text = String(m.content || m.text || "").toLowerCase();
    return text.includes("memory provider") || text.includes("credentials") || text.includes("credential setup");
  });
}

export function buildBrianPreflightQuestions(messages = [], userText = "") {
  if (hasBrianAskedBuilderQuestions(messages)) return null;

  const text = String(userText || "").toLowerCase();
  const wantsAgent = /\b(agent|assistant|chatbot|rag)\b/.test(text);
  const wantsRag = /\b(rag|knowledge\s*base|documents?|memory|vector)\b/.test(text);
  const wantsGoogle = /\ball\s+(the\s+)?google|google integrations|gmail|google calendar|calendar|google sheets|sheets|google drive|drive/.test(text);
  const wantsClaude = /\bclaude|anthropic|cheap|cheaper|lowest-cost|low cost\b/.test(text);

  if (!wantsAgent || (!wantsRag && !wantsGoogle && !wantsClaude)) return null;

  const questions = [];
  if (wantsRag) {
    questions.push({
      id: "memory_provider",
      question: "Which memory provider should power the RAG knowledge base?",
      options: [
        { label: "Pinecone", value: "agent_memory_pinecone", hint: "Recommended vector memory" },
        { label: "Supabase", value: "agent_memory_supabase", hint: "Use only if preferred" },
        { label: "Postgres", value: "agent_memory_postgres", hint: "SQL-backed memory" },
        { label: "Redis", value: "agent_memory_redis", hint: "Fast ephemeral memory" },
      ],
    });
  }

  if (wantsGoogle || wantsClaude) {
    questions.push({
      id: "credential_setup",
      question: "How should Brian handle the required credentials before applying?",
      options: [
        { label: "Pick in plan", value: "pick_in_plan", hint: "Show credential checklist" },
        { label: "Use existing", value: "use_existing", hint: "Prefer connected creds" },
        { label: "Leave empty", value: "leave_empty", hint: "Configure after apply" },
      ],
    });
  }

  if (!questions.length) return null;
  return {
    intro: "I can build this cleanly, but I need to lock the agent memory and credential setup first.",
    questions: questions.slice(0, 2),
  };
}
