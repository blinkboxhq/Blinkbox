import { marked } from "marked";

export default {
  async run(config) {
    const content = config.content;
    if (!content) throw new Error("PDF Generator: 'content' is required.");

    const contentType = config.contentType || "html";
    const format = ["A4", "Letter", "A3", "Legal"].includes(config.format) ? config.format : "A4";
    const filename = config.filename || "document.pdf";

    const marginVal = config.margin || 20;
    const margin = typeof marginVal === "object"
      ? marginVal
      : { top: marginVal, right: marginVal, bottom: marginVal, left: marginVal };

    const htmlContent = contentType === "markdown" ? marked(content) : content;

    const fullHtml = htmlContent.trim().startsWith("<!DOCTYPE") || htmlContent.trim().startsWith("<html")
      ? htmlContent
      : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;line-height:1.6;padding:0;margin:0}</style></head><body>${htmlContent}</body></html>`;

    // Dynamic import to avoid startup cost
    const puppeteer = (await import("puppeteer")).default;
    const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();

    try {
      await page.setContent(fullHtml, { waitUntil: "networkidle0", timeout: 30000 });
      const pdfBuffer = await page.pdf({
        format,
        margin: {
          top: `${margin.top}px`,
          right: `${margin.right}px`,
          bottom: `${margin.bottom}px`,
          left: `${margin.left}px`,
        },
        printBackground: true,
      });

      const pdf = pdfBuffer.toString("base64");
      return { pdf, filename, sizeBytes: pdfBuffer.length, mimeType: "application/pdf" };
    } finally {
      await page.close();
      await browser.close();
    }
  },
};
