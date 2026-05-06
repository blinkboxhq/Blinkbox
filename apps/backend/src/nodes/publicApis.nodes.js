import axios from "axios";

const TIMEOUT = 15000;

// ── arxiv_search ──────────────────────────────────────────────────────────────
export const arxiv_search = {
  async run(config, input) {
    const query = config.query || input?.query || input?.text;
    if (!query) return { success: false, error: "arxiv_search: 'query' is required.", skipped: true };
    const maxResults = parseInt(config.maxResults || 10);
    const res = await axios.get("https://export.arxiv.org/api/query", {
      params: { search_query: `all:${query}`, max_results: maxResults, sortBy: "relevance" },
      timeout: TIMEOUT,
    });
    const entries = [...res.data.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
      const e = m[1];
      const get = (tag) => (e.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1]?.trim() || "";
      return {
        id: get("id").split("/abs/")[1],
        title: get("title").replace(/\s+/g, " "),
        summary: get("summary").replace(/\s+/g, " ").substring(0, 500),
        published: get("published"),
        authors: [...e.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((a) => a[1].trim()),
        link: get("id"),
      };
    });
    return { results: entries, count: entries.length, query };
  },
};

// ── pubmed_search ─────────────────────────────────────────────────────────────
export const pubmed_search = {
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

// ── clinical_trials ───────────────────────────────────────────────────────────
export const clinical_trials = {
  async run(config, input) {
    const query = config.query || input?.query;
    if (!query) return { success: false, error: "clinical_trials: 'query' is required.", skipped: true };
    const maxResults = parseInt(config.maxResults || 10);
    const res = await axios.get("https://clinicaltrials.gov/api/v2/studies", {
      params: { query: { cond: query }, pageSize: maxResults, format: "json" },
      timeout: TIMEOUT,
    });
    const studies = (res.data.studies || []).map((s) => {
      const p = s.protocolSection;
      return {
        nctId: p?.identificationModule?.nctId,
        title: p?.identificationModule?.briefTitle,
        status: p?.statusModule?.overallStatus,
        phase: p?.designModule?.phases?.join(", "),
        condition: p?.conditionsModule?.conditions?.join(", "),
        sponsor: p?.sponsorCollaboratorsModule?.leadSponsor?.name,
        startDate: p?.statusModule?.startDateStruct?.date,
      };
    });
    return { results: studies, count: studies.length, query };
  },
};

// ── drug_lookup ───────────────────────────────────────────────────────────────
export const drug_lookup = {
  async run(config, input) {
    const name = config.name || config.drug || input?.name || input?.drug;
    if (!name) return { success: false, error: "drug_lookup: 'name' is required.", skipped: true };
    const res = await axios.get("https://api.fda.gov/drug/label.json", {
      params: { search: `openfda.brand_name:"${name}" OR openfda.generic_name:"${name}"`, limit: 1 },
      timeout: TIMEOUT,
    });
    const result = res.data.results?.[0];
    if (!result) return { found: false, name };
    const of = result.openfda || {};
    return {
      found: true,
      brandName: of.brand_name?.[0],
      genericName: of.generic_name?.[0],
      manufacturer: of.manufacturer_name?.[0],
      route: of.route?.[0],
      substance: of.substance_name?.[0],
      purpose: result.purpose?.[0]?.substring(0, 300),
      warnings: result.warnings?.[0]?.substring(0, 500),
    };
  },
};

// ── hackernews ────────────────────────────────────────────────────────────────
export const hackernews = {
  async run(config, input) {
    const type = config.type || "top";
    const limit = parseInt(config.limit || 10);
    const storyTypes = { top: "topstories", new: "newstories", best: "beststories", ask: "askstories", show: "showstories" };
    const endpoint = storyTypes[type] || "topstories";
    const idsRes = await axios.get(`https://hacker-news.firebaseio.com/v0/${endpoint}.json`, { timeout: TIMEOUT });
    const ids = (idsRes.data || []).slice(0, limit);
    const stories = await Promise.all(ids.map((id) =>
      axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { timeout: 8000 }).then((r) => ({
        id: r.data.id, title: r.data.title, url: r.data.url, score: r.data.score,
        by: r.data.by, time: new Date(r.data.time * 1000).toISOString(),
        descendants: r.data.descendants || 0, type: r.data.type,
      })).catch(() => null)
    ));
    return { stories: stories.filter(Boolean), count: stories.length, type };
  },
};

// ── wikipedia_lookup ──────────────────────────────────────────────────────────
export const wikipedia_lookup = {
  async run(config, input) {
    const query = config.query || config.title || input?.query || input?.title;
    if (!query) return { success: false, error: "wikipedia_lookup: 'query' is required.", skipped: true };
    const lang = config.lang || "en";
    const res = await axios.get(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`, { timeout: TIMEOUT });
    const d = res.data;
    return {
      title: d.title, displayTitle: d.displaytitle, description: d.description,
      extract: d.extract, extractHtml: d.extract_html,
      thumbnail: d.thumbnail?.source, pageUrl: d.content_urls?.desktop?.page,
      lastModified: d.timestamp, wikibaseItem: d.wikibase_item,
    };
  },
};

// ── npm_package_info ──────────────────────────────────────────────────────────
export const npm_package_info = {
  async run(config, input) {
    const pkg = config.package || input?.package || input?.name;
    if (!pkg) return { success: false, error: "npm_package_info: 'package' is required.", skipped: true };
    const res = await axios.get(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`, { timeout: TIMEOUT });
    const d = res.data;
    const latest = d["dist-tags"]?.latest;
    const latestData = d.versions?.[latest] || {};
    return {
      name: d.name, description: d.description, version: latest,
      license: latestData.license, homepage: d.homepage,
      repository: d.repository?.url, author: d.author?.name || d.author,
      keywords: d.keywords, weeklyDownloads: null,
      dependencies: Object.keys(latestData.dependencies || {}).length,
      devDependencies: Object.keys(latestData.devDependencies || {}).length,
      publishedAt: d.time?.[latest], maintainers: d.maintainers?.map((m) => m.name),
    };
  },
};

// ── news_search ───────────────────────────────────────────────────────────────
export const news_search = {
  async run(config, input, context) {
    const query = config.query || input?.query;
    if (!query) return { success: false, error: "news_search: 'query' is required.", skipped: true };

    const apiKey = config.apiKey || process.env.NEWS_API_KEY;
    if (!apiKey) {
      // Fallback: use free GNews API
      const res = await axios.get("https://gnews.io/api/v4/search", {
        params: { q: query, lang: config.language || "en", max: parseInt(config.maxResults || 10), apikey: process.env.GNEWS_API_KEY || "demo" },
        timeout: TIMEOUT,
      });
      const articles = (res.data.articles || []).map((a) => ({ title: a.title, description: a.description, url: a.url, source: a.source?.name, publishedAt: a.publishedAt, image: a.image }));
      return { articles, count: articles.length, query };
    }

    const res = await axios.get("https://newsapi.org/v2/everything", {
      params: { q: query, language: config.language || "en", pageSize: parseInt(config.maxResults || 10), sortBy: config.sortBy || "relevancy" },
      headers: { "X-Api-Key": apiKey },
      timeout: TIMEOUT,
    });
    const articles = (res.data.articles || []).map((a) => ({ title: a.title, description: a.description, url: a.url, source: a.source?.name, author: a.author, publishedAt: a.publishedAt, urlToImage: a.urlToImage }));
    return { articles, count: articles.length, totalResults: res.data.totalResults, query };
  },
};

// ── producthunt ───────────────────────────────────────────────────────────────
export const producthunt = {
  async run(config, input) {
    const date = config.date || new Date().toISOString().split("T")[0];
    const limit = parseInt(config.limit || 10);
    const query = `{ posts(order: VOTES, postedAfter: "${date}T00:00:00+00:00", first: ${limit}) { edges { node { id name tagline votesCount commentsCount website thumbnail { url } } } } }`;
    try {
      const res = await axios.post("https://api.producthunt.com/v2/api/graphql", { query }, {
        headers: { Authorization: `Bearer ${config.apiKey || process.env.PRODUCTHUNT_API_KEY || ""}`, "Content-Type": "application/json" },
        timeout: TIMEOUT,
      });
      const posts = (res.data.data?.posts?.edges || []).map((e) => e.node);
      return { posts, count: posts.length, date };
    } catch (err) {
      throw new Error(`producthunt: ${err.response?.data?.errors?.[0]?.message || err.message}`);
    }
  },
};

// ── steam_game_lookup ─────────────────────────────────────────────────────────
export const steam_game_lookup = {
  async run(config, input) {
    const appId = config.appId || input?.appId;
    const name = config.name || input?.name;
    if (!appId && !name) return { success: false, error: "steam_game_lookup: 'appId' or 'name' is required.", skipped: true };

    let id = appId;
    if (!id && name) {
      const search = await axios.get("https://api.steampowered.com/ISteamApps/GetAppList/v2/", { timeout: TIMEOUT });
      const apps = search.data.applist?.apps || [];
      const found = apps.find((a) => a.name.toLowerCase() === name.toLowerCase());
      if (!found) return { found: false, name };
      id = found.appid;
    }

    const res = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${id}&cc=us`, { timeout: TIMEOUT });
    const data = res.data?.[id];
    if (!data?.success) return { found: false, appId: id };
    const d = data.data;
    return {
      found: true, appId: id, name: d.name, type: d.type,
      shortDescription: d.short_description, developers: d.developers, publishers: d.publishers,
      isFree: d.is_free, price: d.price_overview?.final_formatted,
      platforms: d.platforms, genres: d.genres?.map((g) => g.description),
      releaseDate: d.release_date?.date, headerImage: d.header_image,
      metacriticScore: d.metacritic?.score,
    };
  },
};

// ── stock_price ───────────────────────────────────────────────────────────────
export const stock_price = {
  async run(config, input) {
    const symbol = (config.symbol || input?.symbol || "AAPL").toUpperCase();
    const apiKey = config.apiKey || process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      // Fallback: Yahoo Finance unofficial
      const res = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`, { timeout: TIMEOUT });
      const meta = res.data.chart?.result?.[0]?.meta;
      return { symbol, price: meta?.regularMarketPrice, currency: meta?.currency, exchange: meta?.exchangeName, previousClose: meta?.previousClose, source: "yahoo" };
    }
    const res = await axios.get("https://www.alphavantage.co/query", {
      params: { function: "GLOBAL_QUOTE", symbol, apikey: apiKey },
      timeout: TIMEOUT,
    });
    const q = res.data["Global Quote"];
    return { symbol, price: parseFloat(q?.["05. price"]), change: parseFloat(q?.["09. change"]), changePercent: q?.["10. change percent"], high: parseFloat(q?.["03. high"]), low: parseFloat(q?.["04. low"]), volume: parseInt(q?.["06. volume"]), source: "alphavantage" };
  },
};

// ── currency_exchange ─────────────────────────────────────────────────────────
export const currency_exchange = {
  async run(config, input) {
    const from = (config.from || input?.from || "USD").toUpperCase();
    const to = (config.to || input?.to || "EUR").toUpperCase();
    const amount = parseFloat(config.amount ?? input?.amount ?? 1);

    try {
      const res = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`, { timeout: TIMEOUT });
      const rate = res.data.rates?.[to];
      if (!rate) throw new Error(`Currency "${to}" not found.`);
      return { from, to, amount, rate, converted: Math.round(amount * rate * 10000) / 10000, date: res.data.date };
    } catch (err) {
      throw new Error(`currency_exchange: ${err.message}`);
    }
  },
};

// ── twitch_stream_status ──────────────────────────────────────────────────────
export const twitch_stream_status = {
  async run(config, input) {
    const username = config.username || input?.username;
    const clientId = config.clientId || process.env.TWITCH_CLIENT_ID;
    const accessToken = config.accessToken || process.env.TWITCH_ACCESS_TOKEN;
    if (!username) return { success: false, error: "twitch_stream_status: 'username' is required.", skipped: true };
    if (!clientId || !accessToken) throw new Error("twitch_stream_status: TWITCH_CLIENT_ID and TWITCH_ACCESS_TOKEN required.");

    const res = await axios.get("https://api.twitch.tv/helix/streams", {
      params: { user_login: username },
      headers: { "Client-Id": clientId, Authorization: `Bearer ${accessToken}` },
      timeout: TIMEOUT,
    });
    const stream = res.data.data?.[0];
    if (!stream) return { username, isLive: false };
    return {
      username, isLive: true, title: stream.title, gameName: stream.game_name,
      viewerCount: stream.viewer_count, startedAt: stream.started_at,
      thumbnailUrl: stream.thumbnail_url?.replace("{width}x{height}", "640x360"),
    };
  },
};
