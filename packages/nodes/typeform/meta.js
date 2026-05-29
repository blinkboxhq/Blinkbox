export default {
  backendType: "typeform",
  label: "Typeform",
  description: "Manage forms and responses via Typeform API",
  fields: [
    { name: "credentialId", label: "Personal Access Token", type: "credential", placeholder: "Select Typeform credential...", accentColor: "#6366f1" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "listResponses", options: [
      { value: "listForms",      label: "List Forms" },
      { value: "getForm",        label: "Get Form" },
      { value: "listResponses",  label: "List Responses" },
      { value: "getResponse",    label: "Get Response" },
      { value: "createForm",     label: "Create Form" },
      { value: "deleteResponse", label: "Delete Response" },
    ]},
    { name: "formId", label: "Form ID", type: "string", smart: true, placeholder: "abc123XYZ", show: { operation: ["getForm","listResponses","getResponse","deleteResponse"] } },
    { name: "pageSize", label: "Page Size", type: "number", default: 25, show: { operation: "listResponses" } },
    { name: "since", label: "Since (ISO date, optional)", type: "string", smart: true, placeholder: "2024-01-01T00:00:00Z", show: { operation: "listResponses" } },
    { name: "includeHidden", label: "Include Hidden Fields", type: "boolean", default: false, show: { operation: "listResponses" } },
    { name: "responseToken", label: "Response Token", type: "string", smart: true, placeholder: "{{ $json.token }}", show: { operation: "getResponse" } },
    { name: "title", label: "Form Title", type: "string", smart: true, placeholder: "Customer Feedback Survey", show: { operation: "createForm" } },
    { name: "fields", label: "Fields (JSON array)", type: "string", smart: true, multiline: true, mono: true, placeholder: '[{"type":"short_text","title":"Your name"}]', show: { operation: "createForm" } },
  ],
  outputs: ["items", "total_items", "page_count", "token"],
};
