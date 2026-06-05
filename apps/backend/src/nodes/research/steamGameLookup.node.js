import axios from "axios";

const TIMEOUT = 15000;

export default {
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
