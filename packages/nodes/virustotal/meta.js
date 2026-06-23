export default {
  backendType: "virustotal",
  label: "VirusTotal",
  description: "Scan URLs, files and IPs for malware and threats",
  fields: [
    { name: "apiKey", label: "API Key", type: "string", smart: false, mono: true, placeholder: "VirusTotal public/private API key" },
    {
      name: "operation", label: "Operation", type: "options", cols: 2, default: "scanUrl",
      options: [
        { value: "scanUrl", label: "Scan URL" },
        { value: "getUrlReport", label: "URL Report" },
        { value: "scanFile", label: "Scan File (hash)" },
        { value: "getIpReport", label: "IP Report" },
      ],
    },
    {
      name: "url", label: "URL", type: "string", smart: true, placeholder: "https://example.com",
      show: { operation: ["scanUrl", "getUrlReport"] },
    },
    {
      name: "hash", label: "File Hash (MD5 / SHA1 / SHA256)", type: "string", smart: true, mono: true,
      placeholder: "{{ $json.hash }}",
      show: { operation: "scanFile" },
    },
    {
      name: "ip", label: "IP Address", type: "string", smart: true, placeholder: "1.2.3.4",
      show: { operation: "getIpReport" },
    },
  ],
  outputs: ["malicious", "suspicious", "harmless", "undetected", "stats", "permalink"],
};
