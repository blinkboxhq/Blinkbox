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
export const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
