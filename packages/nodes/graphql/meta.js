export default {
  backendType: "graphql_request",
  label: "GraphQL",
  description: "Execute a GraphQL query or mutation against any endpoint.",
  fields: [
    { name: "url", label: "Endpoint URL", type: "string", smart: true, placeholder: "https://api.example.com/graphql" },
    { name: "query", label: "Query / Mutation", type: "string", smart: true, multiline: true, placeholder: "query { users { id name } }" },
    { name: "variables", label: "Variables (JSON)", type: "string", smart: true, multiline: true, optional: true, hint: "JSON object of variables" },
    { name: "headers", label: "Headers (JSON)", type: "string", smart: true, multiline: true, optional: true, hint: "JSON object: {Authorization: Bearer ...}" },
    { name: "credentialId", label: "Credential", type: "credential", optional: true, accentColor: "#E535AB" },
  ],
  outputs: ["data", "errors"],
};
