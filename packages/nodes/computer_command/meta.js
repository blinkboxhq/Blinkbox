export default {
  backendType: "computer_command",
  label: "Run Command",
  description: "Run a terminal command on your Linux computer and capture its output.",
  fields: [
    { type: "notice", variant: "info", text: "Runs as root on your Railway Linux computer, with files under /workspace; the backend needs COMPUTER_URL and COMPUTER_TOKEN set." },
    { name: "command", label: "Command", type: "string", smart: true, multiline: true, required: true, placeholder: "df -h / && free -m", examples: ["df -h /", "free -m", "uname -a"] },
    { name: "cwd", label: "Working Folder", type: "string", smart: true, placeholder: "reports", hint: "Relative paths resolve under /workspace" },
    { name: "env", label: "Environment Variables", type: "keyValue", keyPlaceholder: "NAME", valuePlaceholder: "{{ $json.value }}", addLabel: "Add variable" },
    { name: "stdin", label: "Input (stdin)", type: "string", smart: true, multiline: true, placeholder: "{{ $json.text }}", hint: "Piped into the command" },
    { name: "timeoutSeconds", label: "Timeout (seconds)", type: "number", default: 60, hint: "Up to 300 seconds" },
    { name: "failOnError", label: "Stop the run on error", type: "boolean", default: true, hint: "Off: a failed exit or timeout returns success false and error instead" },
    { name: "parseJson", label: "Parse output as JSON", type: "boolean", default: false, hint: "Puts the parsed output in json" },
  ],
  outputs: ["success", "exitCode", "output", "stdout", "stderr", "durationMs", "timedOut", "truncated", "json", "error"],
};
