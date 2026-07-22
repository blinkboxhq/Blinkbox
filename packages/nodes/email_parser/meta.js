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
        { value: "extractInvoice", label: "Invoice", desc: "Pull invoice number, totals and line items" },
        { value: "extractOrder", label: "Order", desc: "Pull order ID, items and shipping details" },
        { value: "extractContact", label: "Contact", desc: "Pull name, email, phone and company" },
        { value: "extractMeeting", label: "Meeting", desc: "Pull title, time, location and attendees" },
        { value: "extractCustom", label: "Custom", desc: "Pull fields you describe in your own words" },
      ],
    },
    {
      name: "emailText", label: "Email Body", type: "string", smart: true, multiline: true,
      placeholder: "{{ $json.body }}",
    },
    {
      name: "customSchema", label: "Fields to Extract (comma-separated)", type: "string", smart: false,
      placeholder: "name, email, phone, company",
      show: { operation: "extractCustom" },
    },
  ],
  outputs: ["extracted", "confidence"],
};
