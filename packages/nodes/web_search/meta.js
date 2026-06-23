export default {
  backendType: "web_search",
  label: "Web Search",
  description: "Query the live internet via Tavily",
  fields: [
    { name: "query", label: "Search Query", type: "string", smart: true, multiline: true, placeholder: "e.g. Latest pricing for competitor X" },
    { type: "row", fields: [
      { name: "searchDepth", label: "Depth", type: "options", cols: 2, default: "basic", options: [
        { value: "basic", label: "Basic (fast)" },
        { value: "advanced", label: "Advanced" },
      ]},
      { name: "topic", label: "Topic", type: "options", cols: 3, default: "general", options: [
        { value: "general", label: "General" },
        { value: "news", label: "News" },
        { value: "finance", label: "Finance" },
      ]},
    ]},
    { name: "maxResults", label: "Max Results", type: "number", default: 5, min: 1, max: 20 },
    { name: "credentialId", label: "Tavily API Key", type: "credential", accentColor: "indigo", placeholder: "Select Tavily credential…" },
  ],
  outputs: ["results", "query", "resultCount"],
};
