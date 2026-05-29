export default {
  backendType: "respond_webhook",
  label: "Webhook Response",
  description: "Send a custom HTTP response to the webhook caller",
  fields: [
    {
      name: "statusCode", label: "Status Code", type: "options", cols: 6, default: 200,
      options: [
        { value: 200, label: "200" }, { value: 201, label: "201" }, { value: 204, label: "204" },
        { value: 400, label: "400" }, { value: 401, label: "401" }, { value: 403, label: "403" },
        { value: 404, label: "404" }, { value: 422, label: "422" }, { value: 429, label: "429" },
        { value: 500, label: "500" }, { value: 502, label: "502" }, { value: 503, label: "503" },
      ],
    },
    {
      name: "mode", label: "Body Type", type: "options", cols: 4, default: "json",
      options: ["json", "text", "html", "empty"],
    },
    {
      name: "body", label: "Body", type: "string", smart: true, multiline: true,
      placeholder: '{ "success": true, "data": {{ $json.result }} }',
      show: { mode: ["json", "text", "html"] },
    },
    {
      name: "headers", label: "Extra Headers (JSON)", type: "string", smart: false, multiline: true, mono: true,
      placeholder: '{ "X-Request-Id": "{{ $json.id }}" }',
    },
  ],
};
