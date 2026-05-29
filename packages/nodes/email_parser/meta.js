export default {
  backendType: "email_parser",
  label: "Email Parser",
  description: "AI-powered email → structured JSON extraction",
  fields: [
    {
      name: "credentialId", label: "Credential (API Key)", type: "string", smart: false, mono: true,
      placeholder: "OpenAI or Anthropic credential ID",
    },
    {
      name: "operation", label: "Extract Type", type: "options", cols: 2, default: "extractInvoice",
      options: [
        { value: "extractInvoice", label: "Invoice" },
        { value: "extractOrder", label: "Order" },
        { value: "extractContact", label: "Contact" },
        { value: "extractMeeting", label: "Meeting" },
        { value: "extractCustom", label: "Custom" },
      ],
    },
    {
      name: "emailText", label: "Email Body", type: "string", smart: true, multiline: true,
      placeholder: "{{ $json.body }}",
    },
    {
      name: "customFields", label: "Fields to Extract (comma-separated)", type: "string", smart: false,
      placeholder: "name, email, phone, company",
      show: { operation: "extractCustom" },
    },
  ],
  outputs: ["extracted", "confidence"],
};
