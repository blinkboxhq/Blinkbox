export default {
  backendType: "computer_info",
  label: "Computer Info",
  description: "Check your Linux computer's CPU, memory, disk and uptime.",
  fields: [
    { type: "notice", variant: "info", text: "Runs as root on your Railway Linux computer, with files under /workspace; the backend needs COMPUTER_URL and COMPUTER_TOKEN set." },
  ],
  outputs: ["success", "hostname", "platform", "arch", "release", "uptimeSec", "loadavg", "cpus", "cpuModel", "memory", "disk"],
};
