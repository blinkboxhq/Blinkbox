export default {
  backendType: "success_failed",
  label: "Success / Failed",
  description: "Explicitly mark this branch as succeeded or failed",
  fields: [
    { name: "outcome", label: "Outcome", type: "options", cols: 2, default: "success", options: [
      { value: "success", label: "Success" },
      { value: "failed",  label: "Failed" },
    ]},
    { name: "message", label: "Message (optional)", type: "string", smart: true, multiline: true, placeholder: "Workflow completed successfully" },
  ],
};
