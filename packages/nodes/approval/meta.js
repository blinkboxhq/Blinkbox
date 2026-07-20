export default {
  backendType: "approval",
  label: "Approval Gate",
  description: "Pause execution until a human approves",
  fields: [
    { name: "label", label: "Approval Label", type: "string", smart: false, placeholder: "Approve order fulfillment" },
    {
      name: "notifyChannels", label: "Notify Via", type: "multiOptions",
      default: ["email"],
      options: ["email", "slack"],
    },
    {
      name: "notifyTo", label: "Notify Email", type: "string", smart: true,
      placeholder: "approver@company.com",
      show: { notifyChannels: "email" },
    },
    {
      name: "slackChannel", label: "Slack Channel", type: "string", smart: true,
      placeholder: "#approvals",
      show: { notifyChannels: "slack" },
    },
    {
      type: "row",
      fields: [
        { name: "timeoutValue", label: "Timeout", type: "number", min: 1, default: 72 },
        {
          name: "timeoutUnit", label: "Unit", type: "options", cols: 1, default: "hours",
          options: ["minutes", "hours", "days"],
        },
      ],
    },
    { type: "notice", variant: "info", text: "After timeout, workflow resumes with approved = false" },
  ],
  outputs: ["status", "label", "notifyTo", "waitingSince"],
};
