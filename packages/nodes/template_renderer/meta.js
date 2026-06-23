export default {
  backendType: "template_renderer",
  label: "Template Renderer",
  description: "Render Handlebars templates with dynamic data",
  fields: [
    {
      name: "template", label: "Template", type: "string", smart: false, multiline: true, mono: true,
      placeholder: "Hello {{name}}!\nYour order #{{orderId}} shipped.\n{{#if trackingUrl}}Track: {{trackingUrl}}{{/if}}",
      hint: "Handlebars syntax: {{variable}}, {{#if cond}}…{{/if}}, {{#each items}}…{{/each}}",
    },
    {
      name: "context", label: "Context Data", type: "string", smart: true, multiline: true,
      placeholder: '{{ $json }}  or  {"name": "Alice", "orderId": "123"}',
      hint: "Pass an object from upstream or a JSON literal",
    },
  ],
  outputs: ["rendered"],
};
