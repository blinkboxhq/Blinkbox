import { Router } from "express";
import { oauthAuthorize, oauthCallback } from "./oauth.controller.js";

const router = Router();

// No verifyToken middleware — authorize uses ?token= query param (browser redirect),
// callback is called by the OAuth provider (no auth header possible).
router.get("/:provider/authorize", oauthAuthorize);
router.get("/:provider/callback", oauthCallback);

export default router;
