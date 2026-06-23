export default {
  backendType: "typeform",
  label: "Typeform",
  description: "Manage forms and retrieve responses via the Typeform API.",
  fields: [
    { name: "credentialId", label: "Credential", type: "credential", accentColor: "#262627" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "listResponses", options: [
      { value: "listForms",      label: "List Forms" },
      { value: "getForm",        label: "Get Form" },
      { value: "listResponses",  label: "List Responses" },
      { value: "getResponse",    label: "Get Response" },
      { value: "createForm",     label: "Create Form" },
      { value: "deleteResponse", label: "Delete Response" },
    ]},

    { name: "listFormsPageSize", label: "Page Size", type: "number", default: 10, show: { operation: ["listForms"] } },
    { name: "search", label: "Search", type: "string", smart: true, optional: true, show: { operation: ["listForms"] } },

    { name: "formId", label: "Form ID", type: "string", smart: true, show: { operation: ["getForm", "listResponses", "getResponse", "deleteResponse"] } },

    { name: "pageSize", label: "Page Size", type: "number", default: 25, show: { operation: ["listResponses"] } },
    { name: "since", label: "Since (ISO date)", type: "string", smart: true, optional: true, placeholder: "2024-01-01T00:00:00Z", show: { operation: ["listResponses"] } },
    { name: "until", label: "Until (ISO date)", type: "string", smart: true, optional: true, show: { operation: ["listResponses"] } },
    { name: "completedOnly", label: "Completed Only", type: "boolean", default: true, show: { operation: ["listResponses"] } },

    { name: "responseId", label: "Response ID", type: "string", smart: true, show: { operation: ["getResponse", "deleteResponse"] } },

    { name: "title", label: "Form Title", type: "string", smart: true, show: { operation: ["createForm"] } },
    { name: "fields", label: "Fields (JSON array)", type: "string", smart: true, multiline: true, hint: "JSON array of Typeform field objects", show: { operation: ["createForm"] } },
  ],
  outputs: ["form", "forms", "response", "responses"],
};
