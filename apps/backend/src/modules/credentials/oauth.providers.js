/**
 * OAUTH PROVIDER REGISTRY
 *
 * Each provider defines:
 *   clientEnvKey / secretEnvKey — env var names for client ID / secret
 *   authorizeUrl   — URL to redirect user to for authorization
 *   tokenUrl       — URL to exchange code for access token
 *   scopes         — array of OAuth scopes
 *   mapTokens(data) — extract access_token, refresh_token, expires_in, metadata from token response
 */

const providers = {
  slack: {
    clientEnvKey: "SLACK_CLIENT_ID",
    secretEnvKey: "SLACK_CLIENT_SECRET",
    authorizeUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: ["chat:write", "channels:read", "groups:read"],
    mapTokens(data) {
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || null,
        expiresIn: data.expires_in || null,
        metadata: {
          teamId: data.team?.id,
          teamName: data.team?.name,
          botUserId: data.bot_user_id,
          appId: data.app_id,
        },
      };
    },
  },

  airtable: {
    clientEnvKey: "AIRTABLE_CLIENT_ID",
    secretEnvKey: "AIRTABLE_CLIENT_SECRET",
    authorizeUrl: "https://airtable.com/oauth2/v1/authorize",
    tokenUrl: "https://airtable.com/oauth2/v1/token",
    scopes: ["data.records:read", "data.records:write", "schema.bases:read"],
    usePKCE: true,
    mapTokens(data) {
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || null,
        expiresIn: data.expires_in || null,
        metadata: {},
      };
    },
  },

  meta: {
    clientEnvKey: "META_APP_ID",
    secretEnvKey: "META_APP_SECRET",
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
    mapTokens(data) {
      return {
        accessToken: data.access_token,
        refreshToken: null, // Meta uses long-lived tokens, no refresh
        expiresIn: data.expires_in || null,
        metadata: {
          tokenType: data.token_type,
        },
      };
    },
  },
};

export function getProvider(name) {
  return providers[name] || null;
}

export function getProviderNames() {
  return Object.keys(providers);
}

export default providers;
