export default {
  backendType: "twilio",
  label: "Twilio",
  description: "Send SMS messages, make voice calls, and look up phone number details.",
  fields: [
    { name: "credentialId", label: "Account SID & Auth Token", type: "credential", accentColor: "#F22F46" },
    { type: "notice", variant: "info", text: "Store your Twilio credential as AccountSID:AuthToken (colon-separated)." },
    { name: "operation", label: "Operation", type: "options", cols: 3, default: "sendSms", options: [
      { value: "sendSms",      label: "Send SMS" },
      { value: "makeCall",     label: "Make Call" },
      { value: "lookupNumber", label: "Lookup Number" },
    ]},
    { name: "to", label: "To", type: "string", smart: true, placeholder: "+15551234567", show: { operation: ["sendSms","makeCall"] } },
    { name: "from", label: "From (Twilio number)", type: "string", smart: true, placeholder: "+15559876543", show: { operation: ["sendSms","makeCall"] } },
    { name: "body", label: "Message", type: "string", smart: true, multiline: true, show: { operation: "sendSms" } },
    { name: "url", label: "TwiML URL", type: "string", smart: true, placeholder: "TwiML URL for call instructions", hint: "URL returning TwiML that controls the call flow", show: { operation: "makeCall" } },
    { name: "phoneNumber", label: "Phone Number", type: "string", smart: true, placeholder: "+15551234567", hint: "E.164 format — returns carrier and line type info", show: { operation: "lookupNumber" } },
  ],
  outputs: ["sid", "status", "lookup"],
};
