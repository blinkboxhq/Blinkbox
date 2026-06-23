export default {
  async run(config, input) {
    const xmlText = config.xml || input.xml || input.body || input.text || input.content || "";
    if (!xmlText) return { success: false, error: "XML Parser: no XML text found.", skipped: true };

    // Lightweight XML-to-JSON using regex (no external deps)
    function xmlToJson(xml) {
      const obj = {};
      let remaining = xml.trim();

      // Strip XML declaration and comments
      remaining = remaining.replace(/<\?[^?]*\?>/g, "").replace(/<!--[\s\S]*?-->/g, "").trim();

      function parseNode(str) {
        str = str.trim();
        const tagMatch = str.match(/^<([^\s/>]+)([^>]*)>([\s\S]*)<\/\1>$/s);
        if (!tagMatch) return str.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').trim();

        const [, tag, attrsStr, inner] = tagMatch;
        const result = {};

        // Parse attributes
        const attrRe = /([^\s=]+)=["']([^"']*)["']/g;
        let m;
        while ((m = attrRe.exec(attrsStr)) !== null) result[`@${m[1]}`] = m[2];

        // Parse children
        const childRe = /<([^\s/>]+)(?:[^>]*)>[\s\S]*?<\/\1>|<([^\s/>]+)[^>]*\/>/g;
        const children = [...inner.matchAll(childRe)];

        if (children.length === 0) {
          const text = inner.trim();
          if (Object.keys(result).length === 0) return text;
          result["#text"] = text;
        } else {
          const used = new Set();
          for (const child of children) {
            const childTag = child[1] || child[2];
            const parsed = parseNode(child[0]);
            if (used.has(childTag)) {
              if (!Array.isArray(result[childTag])) result[childTag] = [result[childTag]];
              result[childTag].push(parsed);
            } else {
              result[childTag] = parsed;
              used.add(childTag);
            }
          }
        }
        return result;
      }

      try {
        const rootMatch = remaining.match(/^<([^\s/>]+)/);
        if (!rootMatch) return { text: remaining };
        const rootTag = rootMatch[1];
        return { [rootTag]: parseNode(remaining) };
      } catch {
        return { raw: remaining };
      }
    }

    const result = xmlToJson(xmlText);
    return { parsed: result, success: true };
  },
};
