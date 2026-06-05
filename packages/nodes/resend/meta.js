export default {
  backendType: "resend",
  label: "Resend",
  description: "Send transactional emails, retrieve delivery details, list sends, and cancel scheduled emails via the Resend API.",
  fields: [
    { name: "credentialId", label: "API Key", type: "credential", accentColor: "#000000" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "sendEmail", options: [
      { value: "sendEmail",   label: "Send Email" },
      { value: "getEmail",    label: "Get Email" },
      { value: "listEmails",  label: "List Emails" },
      { value: "cancelEmail", label: "Cancel Email" },
    ]},
    { name: "from", label: "From", type: "string", smart: true, placeholder: "Team <team@yourdomain.com>", show: { operation: "sendEmail" } },
    { name: "to", label: "To", type: "string", smart: true, show: { operation: "sendEmail" } },
    { name: "subject", label: "Subject", type: "string", smart: true, show: { operation: "sendEmail" } },
    { name: "html", label: "HTML Body (optional)", type: "string", smart: true, multiline: true, show: { operation: "sendEmail" } },
    { name: "text", label: "Plain Text Body (optional)", type: "string", smart: true, multiline: true, show: { operation: "sendEmail" } },
    { name: "replyTo", label: "Reply-To (optional)", type: "string", smart: true, show: { operation: "sendEmail" } },
    { name: "cc", label: "CC (optional)", type: "string", smart: true, show: { operation: "sendEmail" } },
    { name: "emailId", label: "Email ID", type: "string", smart: true, show: { operation: ["getEmail","cancelEmail"] } },
    { name: "limit", label: "Limit", type: "number", default: 10, show: { operation: "listEmails" } },
  ],
  outputs: ["id", "email", "emails"],
};
