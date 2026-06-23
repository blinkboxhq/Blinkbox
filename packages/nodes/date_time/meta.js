export default {
  backendType: "date_time",
  label: "Date / Time",
  description: "Format, parse, add, diff, and convert dates",
  fields: [
    {
      name: "operation", label: "Operation", type: "options", cols: 2, default: "now",
      options: [
        { value: "now", label: "Current Time" },
        { value: "format", label: "Format Date" },
        { value: "parse", label: "Parse Date" },
        { value: "add", label: "Add Duration" },
        { value: "subtract", label: "Subtract Duration" },
        { value: "diff", label: "Date Difference" },
        { value: "convert", label: "Convert Timezone" },
      ],
    },
    {
      name: "date", label: "Date", type: "string", smart: true,
      placeholder: "{{ $json.createdAt }}  or  2024-01-15T10:00:00Z",
      show: { operation: ["format", "parse", "add", "subtract", "diff", "convert"] },
    },
    {
      name: "date2", label: "Second Date", type: "string", smart: true,
      placeholder: "{{ $json.endDate }}",
      show: { operation: "diff" },
    },
    {
      type: "row",
      show: { operation: ["add", "subtract"] },
      fields: [
        { name: "amount", label: "Amount", type: "number", min: 1, default: 1 },
        {
          name: "unit", label: "Unit", type: "options", cols: 2, default: "d",
          options: [
            { value: "ms", label: "ms" }, { value: "s", label: "sec" },
            { value: "m", label: "min" }, { value: "h", label: "hrs" },
            { value: "d", label: "days" }, { value: "w", label: "wks" },
            { value: "M", label: "mo" }, { value: "y", label: "yrs" },
          ],
        },
      ],
    },
    {
      name: "format", label: "Output Format", type: "string", smart: false, mono: true,
      placeholder: "YYYY-MM-DD  (blank = ISO 8601)",
      hint: "Tokens: YYYY MM DD HH mm ss SSS",
      show: { operation: ["format", "now"] },
    },
    {
      name: "timezone", label: "Target Timezone", type: "string", smart: false, mono: true,
      placeholder: "America/New_York",
      hint: "IANA timezone string, e.g. Europe/London",
      show: { operation: "convert" },
    },
  ],
  outputs: ["result", "timestamp", "formatted"],
};
