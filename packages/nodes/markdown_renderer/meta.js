export default {
  backendType: "markdown_renderer",
  label: "Markdown Renderer",
  description: "Convert markdown to HTML",
  fields: [
    {
      name: "field", label: "Markdown Field", type: "string", smart: true,
      placeholder: "{{ $json.markdown }}",
    },
    {
      name: "sanitize", label: "Sanitize HTML", type: "boolean", default: true,
      hint: "Remove dangerous tags like <script>",
    },
    {
      name: "breaks", label: "GFM Line Breaks", type: "boolean", default: true,
      hint: "Convert single newlines to <br>",
    },
    {
      name: "outputField", label: "Output Field", type: "string", smart: false, mono: true, default: "html",
    },
  ],
  outputs: ["html"],
};
