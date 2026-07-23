import axios from "axios";

export default {
  async run(config, input) {
    const ip = config.ip || input?.ip || input?.ipAddress;
    if (!ip) return { success: false, error: "ip_lookup: 'ip' is required.", skipped: true };

    try {
      const res = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 120000 });
      const d = res.data;
      if (d.error) throw new Error(d.reason || "Invalid IP");
      return {
        ip: d.ip, city: d.city, region: d.region, country: d.country_name,
        countryCode: d.country_code, continent: d.continent_code,
        latitude: d.latitude, longitude: d.longitude,
        timezone: d.timezone, isp: d.org,
        currency: d.currency, callingCode: d.country_calling_code,
      };
    } catch (err) {
      throw new Error(`ip_lookup: ${err.message}`);
    }
  },
};
