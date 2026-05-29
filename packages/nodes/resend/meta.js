export default {
  backendType: "resend",
  label: "Resend",
  description: "Send transactional email via the Resend API",
  fields: [
    { name: "credentialId", label: "API Key", type: "credential", placeholder: "Resend credential", accentColor: "#f97316" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "sendEmail", options: [
      { value: "sendEmail",  label: "Send Email" },
      { value: "sendBatch",  label: "Batch Send" },
    ]},
    { name: "from", label: "From", type: "string", smart: true, placeholder: "BlinkBox <hello@yourdomain.com>", show: { operation: "sendEmail" } },
    { name: "to", label: "To", type: "string", smart: true, placeholder: "{{ upstream.email }} or user@example.com", show: { operation: "sendEmail" } },
    { name: "subject", label: "Subject", type: "string", smart: true, placeholder: "Your order is confirmed!", show: { operation: "sendEmail" } },
    { name: "html", label: "HTML Body", type: "string", smart: true, multiline: true, placeholder: "{{ template_renderer.rendered }}", show: { operation: "sendEmail" } },
    { name: "replyTo", label: "Reply-To (optional)", type: "string", smart: true, placeholder: "support@yourdomain.com", show: { operation: "sendEmail" } },
    { name: "emails", label: "Emails Array", type: "string", smart: true, placeholder: "{{ upstream.emails }}  — [{from, to, subject, html}]", show: { operation: "sendBatch" } },
  ],
  outputs: ["id", "ids"],
};
