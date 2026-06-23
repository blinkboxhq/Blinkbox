import axios from "axios";

const TIMEOUT = 15000;

export default {
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
