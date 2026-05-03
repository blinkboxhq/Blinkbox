/**
 * OAUTH PROVIDER REGISTRY
 *
 * Each provider defines:
 *   clientEnvKey / secretEnvKey — env var names for client ID / secret
 *   authorizeUrl   — URL to redirect user to for authorization
 *   tokenUrl       — URL to exchange code for access token
 *   scopes         — array of OAuth scopes
 *   usePKCE        — enable PKCE flow (Airtable, GitHub)
 *   mapTokens(data) — extract access_token, refresh_token, expires_in, metadata
 */

const providers = {

  // ── Google ──────────────────────────────────────────────────────────────────
  google: {
    clientEnvKey: "GOOGLE_CLIENT_ID",
    secretEnvKey: "GOOGLE_CLIENT_SECRET",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    extraParams: { access_type: "offline", prompt: "consent" },
    mapTokens(data) {
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || null,
        expiresIn: data.expires_in || 3600,
        metadata: {
          tokenType: data.token_type,
          scope: data.scope,
        },
      };
    },
  },

  // ── Slack ───────────────────────────────────────────────────────────────────
  slack: {
    clientEnvKey: "SLACK_CLIENT_ID",
    secretEnvKey: "SLACK_CLIENT_SECRET",
    authorizeUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: [
      "chat:write",
      "chat:write.public",
      "channels:read",
      "channels:history",
      "groups:read",
      "groups:history",
      "users:read",
      "files:write",
      "reactions:write",
    ],
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

  // ── Microsoft / Azure AD ────────────────────────────────────────────────────
  microsoft: {
    clientEnvKey: "MICROSOFT_CLIENT_ID",
    secretEnvKey: "MICROSOFT_CLIENT_SECRET",
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: [
      "offline_access",
      "User.Read",
      "Mail.ReadWrite",
      "Mail.Send",
      "Calendars.ReadWrite",
      "Files.ReadWrite",
      "Tasks.ReadWrite",
      "TeamMember.Read.All",
      "ChannelMessage.Send",
    ],
    mapTokens(data) {
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || null,
        expiresIn: data.expires_in || 3600,
        metadata: {
          tokenType: data.token_type,
          scope: data.scope,
        },
      };
    },
  },

  // ── GitHub ──────────────────────────────────────────────────────────────────
  github: {
    clientEnvKey: "GITHUB_CLIENT_ID",
    secretEnvKey: "GITHUB_CLIENT_SECRET",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: [
      "repo",
      "read:user",
      "user:email",
      "workflow",
      "read:org",
      "issues:write",
    ],
    tokenResponseType: "form", // GitHub returns form-encoded, not JSON
    mapTokens(data) {
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || null,
        expiresIn: data.expires_in || null,
        metadata: {
          tokenType: data.token_type,
          scope: data.scope,
        },
      };
    },
  },

  // ── Airtable ────────────────────────────────────────────────────────────────
  airtable: {
    clientEnvKey: "AIRTABLE_CLIENT_ID",
    secretEnvKey: "AIRTABLE_CLIENT_SECRET",
    authorizeUrl: "https://airtable.com/oauth2/v1/authorize",
    tokenUrl: "https://airtable.com/oauth2/v1/token",
    scopes: [
      "data.records:read",
      "data.records:write",
      "data.recordComments:read",
      "data.recordComments:write",
      "schema.bases:read",
      "schema.bases:write",
      "webhook:manage",
    ],
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

  // ── Notion ──────────────────────────────────────────────────────────────────
  notion: {
    clientEnvKey: "NOTION_CLIENT_ID",
    secretEnvKey: "NOTION_CLIENT_SECRET",
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    scopes: [],
    useBasicAuth: true, // Notion requires Basic auth on token exchange
    extraParams: { response_type: "code" },
    mapTokens(data) {
      return {
        accessToken: data.access_token,
        refreshToken: null,
        expiresIn: null,
        metadata: {
          workspaceId: data.workspace_id,
          workspaceName: data.workspace_name,
          workspaceIcon: data.workspace_icon,
          botId: data.bot_id,
          ownerType: data.owner?.type,
        },
      };
    },
  },

  // ── Meta (WhatsApp / Instagram) ─────────────────────────────────────────────
  meta: {
    clientEnvKey: "META_APP_ID",
    secretEnvKey: "META_APP_SECRET",
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
    mapTokens(data) {
      return {
        accessToken: data.access_token,
        refreshToken: null,
        expiresIn: data.expires_in || null,
        metadata: { tokenType: data.token_type },
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
