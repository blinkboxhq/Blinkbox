import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

/**
 * Validated environment configuration.
 * dotenv is loaded here to ensure env vars are available regardless of import order.
 */

if (!process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is required");
}

if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 32) {
  throw new Error("FATAL: ENCRYPTION_KEY must be exactly 32 characters");
}

export const JWT_SECRET = process.env.JWT_SECRET;
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
// BACKEND_PUBLIC_URL must be the public-facing URL (e.g. https://blinkbox-backend-production.up.railway.app)
// BACKEND_URL may be an internal hostname (Railway internal) — not reachable from external services like Telegram
export const BACKEND_URL = process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;

// ── OAuth App Credentials (optional — only needed for OAuth Connect buttons) ──
// These are NOT validated at startup — OAuth flows gracefully return an error
// if the env var is missing, so the app still boots without them.
export const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || null;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || null;
export const SLACK_CLIENT_ID      = process.env.SLACK_CLIENT_ID      || null;
export const SLACK_CLIENT_SECRET  = process.env.SLACK_CLIENT_SECRET  || null;
export const MICROSOFT_CLIENT_ID     = process.env.MICROSOFT_CLIENT_ID     || null;
export const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || null;
export const GITHUB_CLIENT_ID     = process.env.GITHUB_CLIENT_ID     || null;
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || null;
export const AIRTABLE_CLIENT_ID     = process.env.AIRTABLE_CLIENT_ID     || null;
export const AIRTABLE_CLIENT_SECRET = process.env.AIRTABLE_CLIENT_SECRET || null;
export const NOTION_CLIENT_ID     = process.env.NOTION_CLIENT_ID     || null;
export const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET || null;
export const META_APP_ID     = process.env.META_APP_ID     || null;
export const META_APP_SECRET = process.env.META_APP_SECRET || null;
