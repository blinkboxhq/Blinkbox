export default {
  backendType: "twilio",
  label: "Twilio",
  description: "SMS, voice calls & phone lookup",
  fields: [
    { name: "operation", label: "Operation", type: "options", cols: 3, default: "sendSms", options: [
      { value: "sendSms",      label: "Send SMS" },
      { value: "makeCall",     label: "Make Call" },
      { value: "lookupNumber", label: "Lookup Number" },
    ]},
    { name: "from", label: "From (Twilio number)", type: "string", smart: true, placeholder: "+14155551234", show: { operation: ["sendSms","makeCall"] } },
    { name: "to", label: "To", type: "string", smart: true, placeholder: "{{trigger.data.phone}}", show: { operation: ["sendSms","makeCall"] } },
    { name: "body", label: "Message", type: "string", smart: true, multiline: true, placeholder: "Hello {{trigger.data.name}}!", show: { operation: "sendSms" } },
    { name: "url", label: "TwiML URL", type: "string", smart: true, placeholder: "https://yourapp.com/twiml/greeting", hint: "URL that returns TwiML to control the call", show: { operation: "makeCall" } },
    { name: "phoneNumber", label: "Phone Number", type: "string", smart: true, placeholder: "+14155551234", hint: "E.164 format — returns carrier & line type info", show: { operation: "lookupNumber" } },
    { name: "credentialId", label: "Twilio Account SID:AuthToken", type: "credential", accentColor: "red", placeholder: "Select Twilio credential…" },
    { type: "notice", variant: "info", text: "Format credential as AccountSID:AuthToken" },
  ],
};
