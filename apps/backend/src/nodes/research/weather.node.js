import axios from "axios";

const TIMEOUT = 15000;

export default {
  async run(config, input) {
    const location = config.location || input?.location || input?.city;
    const units = config.units || "metric";
    const apiKey = config.apiKey || process.env.OPENWEATHER_API_KEY;
    if (!location) return { success: false, error: "weather: 'location' is required.", skipped: true };
    if (!apiKey) throw new Error("weather: OPENWEATHER_API_KEY is required.");
    const res = await axios.get("https://api.openweathermap.org/data/2.5/weather", {
      params: { q: location, units, appid: apiKey },
      timeout: TIMEOUT,
    });
    const d = res.data;
    return {
      city: d.name, country: d.sys?.country, temp: d.main?.temp,
      feelsLike: d.main?.feels_like, humidity: d.main?.humidity,
      description: d.weather?.[0]?.description, icon: d.weather?.[0]?.icon,
      windSpeed: d.wind?.speed, pressure: d.main?.pressure,
      visibility: d.visibility, clouds: d.clouds?.all,
      sunrise: new Date(d.sys?.sunrise * 1000).toISOString(),
      sunset: new Date(d.sys?.sunset * 1000).toISOString(),
    };
  },
};
