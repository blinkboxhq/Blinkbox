export default {
  backendType: "json_validator",
  label: "JSON Schema Validator",
  description: "Validate data structure before it continues",
  fields: [
    {
      name: "data", label: "Data to Validate", type: "string", smart: true,
      placeholder: "{{ $json.payload }}",
    },
    {
      name: "schema", label: "JSON Schema", type: "string", smart: false, multiline: true, mono: true,
      placeholder: '{\n  "type": "object",\n  "required": ["email"],\n  "properties": {\n    "email": { "type": "string" }\n  }\n}',
    },
    {
      name: "failMode", label: "On Failure", type: "options", cols: 2, default: "stop",
      options: [
        { value: "stop", label: "Stop & Error" },
        { value: "continue", label: "Continue (tag)" },
      ],
    },
  ],
  outputs: ["valid", "errors", "data"],
};
