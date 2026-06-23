export default {
  backendType: "ip_lookup",
  label: "IP Lookup",
  description: "Geolocation and ISP info from an IP address",
  fields: [
    {
      name: "ip", label: "IP Address", type: "string", smart: true,
      placeholder: "8.8.8.8  or  {{ $json.ip }}",
      hint: "Leave blank to look up the current request's IP",
    },
    {
      name: "fields", label: "Fields to Return", type: "multiOptions",
      default: ["ip", "city", "region", "country_name", "latitude", "longitude", "timezone", "org"],
      options: [
        { value: "ip", label: "IP" }, { value: "city", label: "City" },
        { value: "region", label: "Region" }, { value: "country_name", label: "Country" },
        { value: "country_code", label: "Code" }, { value: "postal", label: "Postal" },
        { value: "latitude", label: "Latitude" }, { value: "longitude", label: "Longitude" },
        { value: "timezone", label: "Timezone" }, { value: "org", label: "ISP/Org" },
        { value: "asn", label: "ASN" }, { value: "currency", label: "Currency" },
        { value: "languages", label: "Languages" },
      ],
    },
    { type: "notice", variant: "info", text: "Powered by ipapi.co — free tier, no API key required" },
  ],
  outputs: ["ip", "city", "country", "timezone", "org"],
};
