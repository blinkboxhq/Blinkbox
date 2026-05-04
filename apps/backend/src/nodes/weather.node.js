import axios from "axios";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";

const OWM_BASE = "https://api.openweathermap.org/data/2.5";

export default {
  async run(config, input, context = {}) {
    const location = config.location || input.location || input.city || "";
    if (!location) return { success: false, error: "Weather: 'location' is required.", skipped: true };

    const units = config.units || "metric";
    const mode = config.mode || "current";
    const days = Math.min(config.days || 3, 7);

    let apiKey = config.apiKey;
    if (!apiKey && config.credentialId) {
      const cred = await resolveCredential(config.credentialId, context.workspaceId, "Weather");
      apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);
    }
    if (!apiKey) return { success: false, error: "Weather: OpenWeatherMap API key required.", skipped: true };

    const params = { q: location, appid: apiKey, units };

    if (mode === "forecast") {
      const { data } = await axios.get(`${OWM_BASE}/forecast`, { params: { ...params, cnt: days * 8 }, timeout: 10000 });
      const daily = [];
      const seen = new Set();
      for (const item of data.list) {
        const date = item.dt_txt.split(" ")[0];
        if (!seen.has(date) && daily.length < days) {
          seen.add(date);
          daily.push({ date, temp: item.main.temp, feels_like: item.main.feels_like, description: item.weather[0].description, humidity: item.main.humidity, wind_speed: item.wind.speed });
        }
      }
      return { location: data.city.name, country: data.city.country, forecast: daily, units };
    }

    const { data } = await axios.get(`${OWM_BASE}/weather`, { params, timeout: 10000 });
    return {
      location: data.name, country: data.sys.country,
      temp: data.main.temp, feels_like: data.main.feels_like,
      temp_min: data.main.temp_min, temp_max: data.main.temp_max,
      humidity: data.main.humidity, pressure: data.main.pressure,
      description: data.weather[0].description, icon: data.weather[0].icon,
      wind_speed: data.wind.speed, wind_deg: data.wind.deg,
      visibility: data.visibility, sunrise: new Date(data.sys.sunrise * 1000).toISOString(),
      sunset: new Date(data.sys.sunset * 1000).toISOString(), units,
    };
  },
};
