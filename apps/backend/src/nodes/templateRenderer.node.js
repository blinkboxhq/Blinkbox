import Handlebars from "handlebars";

export default {
  async run(config) {
    const template = config.template;
    if (!template) throw new Error("Template Renderer: 'template' is required.");

    let ctx = config.context;
    if (typeof ctx === "string") {
      try { ctx = JSON.parse(ctx); } catch { ctx = {}; }
    }
    if (!ctx || typeof ctx !== "object") ctx = {};

    let rendered;
    try {
      rendered = Handlebars.compile(template)(ctx);
    } catch (err) {
      throw new Error(`Template Renderer: ${err.message}`);
    }

    return {
      rendered,
      templateLength: template.length,
      outputLength: rendered.length,
    };
  },
};
