export default {
  backendType: "openai_assistant",
  label: "OpenAI Assistants",
  description: "Persistent threads with file search and code interpreter",
  fields: [
    { name: "credentialId", label: "OpenAI Credential", type: "credential", placeholder: "OpenAI API key", accentColor: "#10a37f" },
    { name: "operation", label: "Operation", type: "options", cols: 2, default: "addMessageAndRun", options: [
      { value: "addMessageAndRun", label: "Send Message & Run" },
      { value: "createThread",     label: "Create Thread" },
      { value: "listMessages",     label: "List Messages" },
      { value: "deleteThread",     label: "Delete Thread" },
    ]},
    { name: "assistantId", label: "Assistant ID", type: "string", smart: false, mono: true, placeholder: "asst_abc123...", show: { operation: "addMessageAndRun" } },
    { name: "threadId", label: "Thread ID", type: "string", smart: true, placeholder: "{{ upstream.threadId }}  (blank = auto-create)", show: { operation: ["addMessageAndRun","listMessages","deleteThread"] } },
    { name: "message", label: "Message", type: "string", smart: true, multiline: true, placeholder: "{{ telegram_trigger.text }}", show: { operation: "addMessageAndRun" } },
    { name: "instructions", label: "Instructions Override (optional)", type: "string", smart: true, multiline: true, placeholder: "Custom system instructions for this run", show: { operation: "addMessageAndRun" } },
    { name: "enableFileSearch", label: "File Search", type: "boolean", default: false, show: { operation: "addMessageAndRun" } },
    { name: "enableCodeInterpreter", label: "Code Interpreter", type: "boolean", default: false, show: { operation: "addMessageAndRun" } },
  ],
  outputs: ["reply", "threadId", "runId", "messages"],
};
