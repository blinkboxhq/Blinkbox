export default {
  backendType: "port_monitor",
  label: "Port Monitor",
  description: "Check if a TCP port is open and measure latency",
  fields: [
    { name: "host", label: "Host", type: "string", smart: true, placeholder: "example.com or 1.2.3.4" },
    {
      type: "row",
      fields: [
        { name: "port", label: "Port", type: "number", min: 1, max: 65535, default: 80 },
        { name: "timeout", label: "Timeout (ms)", type: "number", min: 500, max: 30000, step: 500, default: 5000 },
      ],
    },
  ],
  outputs: ["host", "port", "isOpen", "latencyMs", "checkedAt"],
};
