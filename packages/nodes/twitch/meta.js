export default {
  backendType: "twitch",
  label: "Twitch",
  description: "Monitor streams, get channel info, clips, or schedule",
  fields: [
    { name: "credentialId", label: "Twitch App Credential", type: "credential", placeholder: "Twitch OAuth credential", accentColor: "#9146ff" },
    { name: "mode", label: "Mode", type: "options", cols: 2, default: "info", options: [
      { value: "status",   label: "Live Status" },
      { value: "info",     label: "Channel Info" },
      { value: "clips",    label: "Get Clips" },
      { value: "schedule", label: "Schedule" },
    ]},
    { name: "username", label: "Channel Username", type: "string", smart: true, placeholder: "shroud" },
    { name: "clipsCount", label: "Number of Clips", type: "number", default: 10, show: { mode: "clips" } },
    { name: "alertOnLive", label: "Fail when offline", type: "boolean", default: false, hint: "Route to failure branch when stream is offline", show: { mode: "status" } },
  ],
  outputs: ["isLive", "username", "title", "game", "viewers", "clips", "schedule"],
};
