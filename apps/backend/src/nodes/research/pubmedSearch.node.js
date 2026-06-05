import axios from "axios";

const TIMEOUT = 15000;

export default {
  async run(config, input) {
    const query = config.query || input?.query;
    if (!query) return { success: false, error: "pubmed_search: 'query' is required.", skipped: true };
    const maxResults = parseInt(config.maxResults || 10);
    const searchRes = await axios.get("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi", {
      params: { db: "pubmed", term: query, retmax: maxResults, retmode: "json", sort: "relevance" },
      timeout: TIMEOUT,
    });
    const ids = searchRes.data.esearchresult?.idlist || [];
    if (!ids.length) return { results: [], count: 0, query };

    const fetchRes = await axios.get("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi", {
      params: { db: "pubmed", id: ids.join(","), retmode: "json" },
      timeout: TIMEOUT,
    });
    const uids = fetchRes.data.result?.uids || [];
    const results = uids.map((uid) => {
      const a = fetchRes.data.result[uid];
      return { pmid: uid, title: a?.title, authors: a?.authors?.map((x) => x.name), journal: a?.fulljournalname, pubdate: a?.pubdate, doi: a?.elocationid };
    });
    return { results, count: results.length, query };
  },
};
