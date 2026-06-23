export default {
  backendType: "ssl_check",
  label: "SSL Check",
  description: "Inspect TLS certificate validity and expiry",
  fields: [
    { name: "hostname", label: "Hostname", type: "string", smart: true, placeholder: "example.com" },
    { name: "port", label: "Port", type: "number", min: 1, max: 65535, default: 443 },
  ],
  outputs: ["valid", "daysUntilExpiry", "expired", "expiringSoon", "issuer", "validTo"],
};
