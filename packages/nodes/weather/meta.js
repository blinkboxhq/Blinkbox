export default {
  backendType: "weather",
  label: "Weather",
  description: "Current weather or forecast via OpenWeatherMap",
  fields: [
    {
      name: "location", label: "Location", type: "string", smart: true,
      placeholder: "Mumbai, IN  or  {{ $json.city }}",
      hint: "City name, 'City,CountryCode' or lat,lon",
    },
    {
      name: "mode", label: "Mode", type: "options", cols: 2, default: "current",
      options: [{ value: "current", label: "Current Weather" }, { value: "forecast", label: "Forecast" }],
    },
    { name: "days", label: "Days Ahead", type: "number", min: 1, max: 7, default: 3, show: { mode: "forecast" } },
    {
      name: "units", label: "Units", type: "options", cols: 3, default: "metric",
      options: [
        { value: "metric", label: "°C / km/h" },
        { value: "imperial", label: "°F / mph" },
        { value: "standard", label: "K / m/s" },
      ],
    },
    { name: "credentialId", label: "OpenWeatherMap API Key", type: "credential", accentColor: "sky" },
  ],
  outputs: ["temp", "feels_like", "humidity", "wind", "description", "icon", "sunrise", "sunset"],
};
