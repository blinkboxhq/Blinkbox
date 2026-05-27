import axios from "axios";
import { getOAuthToken } from "../utils/getOAuthToken.js";

export default {
  async run(config, input) {
    if (input?.documentId && input?.title) return input;
    const token = await getOAuthToken(config.credentialId, config.workspaceId, "Google Docs");
    const documentId = config.documentId;
    if (!documentId) throw new Error("[google_docs_trigger] documentId is required");
    const { data } = await axios.get(`https://docs.googleapis.com/v1/documents/${documentId}`, { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 });
    const body = data?.body?.content ?? [];
    const extractText = (content) => content.flatMap(el => el?.paragraph?.elements?.map(e => e?.textRun?.content ?? "") ?? extractText(el?.table?.tableRows?.flatMap(r => r.tableCells?.flatMap(c => c.content ?? []) ?? []) ?? [])).join("");
    const plainText = extractText(body).trim();
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;
    const styles = {};
    body.forEach(el => {
      if (el?.paragraph) {
        const style = el.paragraph.paragraphStyle?.namedStyleType;
        if (style) styles[style] = (styles[style] || 0) + 1;
      }
    });
    return {
      documentId, title: data?.title,
      url: `https://docs.google.com/document/d/${documentId}/edit`,
      plainText: config.includeContent !== false ? plainText.slice(0, 10000) : null,
      wordCount, charCount: plainText.length,
      headings: styles,
      revisionId: data?.revisionId,
      inlineObjects: Object.keys(data?.inlineObjects ?? {}).length,
      suggestionsViewMode: data?.suggestionsViewMode,
      locale: data?.locale,
      triggeredAt: new Date().toISOString(),
    };
  },
};
