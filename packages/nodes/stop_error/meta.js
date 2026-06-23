export default {
  backendType: "stop_error",
  label: "Stop & Error",
  description: "Halt workflow and throw a custom error",
  fields: [
    {
      name: "message", label: "Error Message", type: "string", smart: true, multiline: true,
      placeholder: "Something went wrong: {{ $json.reason }}",
    },
    {
      name: "code", label: "Error Code", type: "string", smart: false, mono: true,
      default: "WORKFLOW_ERROR", placeholder: "WORKFLOW_ERROR",
    },
    { type: "notice", variant: "error", text: "This node immediately halts the workflow and marks it as failed." },
  ],
};
