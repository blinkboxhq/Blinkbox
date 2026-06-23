export default {
  backendType: "ip_whitelist",
  label: "IP Whitelist Check",
  description: "Allow or block IPs, ranges and countries",
  fields: [
    { name: "ip", label: "IP Address to Check", type: "string", smart: true, placeholder: '{{ $json.ip }}  or  {{ $request.headers["x-forwarded-for"] }}' },
    { name: "mode", label: "Mode", type: "options", cols: 2, default: "whitelist", options: [
      { value: "whitelist", label: "Whitelist — allow only listed IPs" },
      { value: "blacklist", label: "Blacklist — block listed, allow rest" },
    ]},
    { name: "whitelist", label: "IP List (one per line, supports CIDR)", type: "string", smart: false, multiline: true,
      placeholder: "192.168.1.100\n10.0.0.0/8\n203.0.113.0/24",
      hint: "Supports exact IPs, CIDR ranges (10.0.0.0/8), and wildcards (192.168.*)" },
    { name: "blockCountries", label: "Block Countries (ISO codes)", type: "string", smart: true, placeholder: "CN, RU, KP" },
    { name: "allowPrivate", label: "Allow Private IPs", type: "boolean", default: false, hint: "10.x, 172.16.x, 192.168.x always pass" },
    { name: "lookupGeo", label: "Include Geo Info", type: "boolean", default: false, hint: "Add country, city to output" },
    { name: "failIfBlock", label: "Stop if Blocked", type: "boolean", default: true, hint: "Route to error/false when IP is blocked" },
  ],
  outputs: ["allowed", "ip", "matchedRule", "country", "city"],
};
