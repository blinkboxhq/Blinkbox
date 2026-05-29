export default {
  backendType: "pdf_generator",
  label: "PDF Generator",
  description: "Generate a PDF from HTML or Markdown content",
  fields: [
    {
      name: "contentType", label: "Content Type", type: "options", cols: 2, default: "html",
      options: ["html", "markdown"],
    },
    {
      name: "content", label: "Content", type: "string", smart: true, multiline: true,
      placeholder: "{{ $json.html }}  or paste HTML/Markdown here",
    },
    {
      type: "row",
      fields: [
        {
          name: "format", label: "Page Format", type: "options", cols: 2, default: "A4",
          options: ["A4", "Letter", "A3", "Legal"],
        },
        { name: "margin", label: "Margin (px)", type: "number", min: 0, max: 200, default: 20 },
      ],
    },
    {
      name: "filename", label: "Filename", type: "string", smart: true, mono: true,
      placeholder: "report-{{ $json.id }}.pdf",
      default: "document.pdf",
    },
  ],
  outputs: ["dataUrl", "base64", "filename", "size"],
};
