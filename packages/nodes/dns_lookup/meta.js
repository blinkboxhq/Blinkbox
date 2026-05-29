export default {
  backendType: "dns_lookup",
  label: "DNS Lookup",
  description: "Resolve DNS records for any hostname",
  fields: [
    { name: "hostname", label: "Hostname", type: "string", smart: true, placeholder: "example.com" },
    {
      name: "type", label: "Record Type", type: "options", cols: 4, default: "A",
      options: ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA"],
    },
  ],
  outputs: ["hostname", "type", "records", "count"],
};
