// Self-hosted builds ship without the marketing site: "/" is the login screen,
// and social sign-in is hidden because a self-hoster has no Blinkbox OAuth app.
export const IS_SELF_HOSTED = import.meta.env.VITE_SELF_HOSTED === 'true';
