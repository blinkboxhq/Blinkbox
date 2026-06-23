export default {
  async run(config) {
    const text = typeof config.text === "string" ? config.text : String(config.text ?? "");
    if (!text) return { chunks: [], chunkCount: 0, totalLength: 0 };

    const mode = config.mode || "characters";
    const chunkSize = Math.max(parseInt(config.chunkSize) || 500, 1);
    const overlap = Math.max(Math.min(parseInt(config.overlap) || 0, chunkSize - 1), 0);

    let chunks = [];

    if (mode === "characters") {
      let i = 0;
      while (i < text.length) {
        chunks.push(text.slice(i, i + chunkSize));
        i += chunkSize - overlap;
        if (chunkSize === overlap) break;
      }
    } else if (mode === "words") {
      const words = text.split(/\s+/).filter(Boolean);
      let i = 0;
      while (i < words.length) {
        chunks.push(words.slice(i, i + chunkSize).join(" "));
        i += chunkSize - overlap;
        if (chunkSize === overlap) break;
      }
    } else if (mode === "sentences") {
      const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
      let i = 0;
      while (i < sentences.length) {
        chunks.push(sentences.slice(i, i + chunkSize).join(" "));
        i += chunkSize - overlap;
        if (chunkSize === overlap) break;
      }
    } else if (mode === "paragraphs") {
      chunks = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
    }

    return { chunks, chunkCount: chunks.length, totalLength: text.length };
  },
};
