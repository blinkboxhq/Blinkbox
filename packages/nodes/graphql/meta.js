export default {
  backendType: "graphql",
  label: "GraphQL",
  description: "Execute a GraphQL query or mutation against any endpoint",
  fields: [
    { name: "endpoint", label: "Endpoint URL", type: "string", smart: true, placeholder: "https://api.example.com/graphql" },
    { name: "query", label: "Query / Mutation", type: "string", smart: true, multiline: true, mono: true, placeholder: "query { users { id name } }" },
    { name: "variables", label: "Variables (JSON)", type: "string", smart: true, multiline: true, mono: true, placeholder: '{ "id": "123" }' },
    { name: "authType", label: "Auth", type: "options", cols: 3, default: "none", options: [
      { value: "none",   label: "None" },
      { value: "bearer", label: "Bearer token" },
      { value: "apikey", label: "API key header" },
    ]},
    { name: "credentialId", label: "Credential", type: "credential", placeholder: "GraphQL API credential", accentColor: "#e535ab", show: { authType: ["bearer","apikey"] } },
    { name: "headers", label: "Extra Headers (JSON)", type: "string", smart: true, multiline: true, mono: true, placeholder: '{ "X-Org-Id": "abc" }' },
    { name: "timeout", label: "Timeout (ms)", type: "number", default: 10000 },
  ],
  outputs: ["data", "errors"],
};
