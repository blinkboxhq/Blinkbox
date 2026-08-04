// Self-hosted builds ship without the marketing site: "/" is the login screen,
// and social sign-in is hidden because a self-hoster has no Blinkbox OAuth app.
export const IS_SELF_HOSTED = import.meta.env.VITE_SELF_HOSTED === 'true';

// A self-hosted install is served by the same host that proxies /api, so the
// API base is simply the origin the page came from. That is what lets one
// prebuilt image serve any customer domain — Vite inlines VITE_API_URL at build
// time, so baking a hostname in would mean a rebuild per install.
export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (IS_SELF_HOSTED ? window.location.origin : 'http://localhost:3000');
