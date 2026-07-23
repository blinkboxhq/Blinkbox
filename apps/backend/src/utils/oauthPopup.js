/**
 * OAUTH POPUP RESULT PAGE
 *
 * Shared by every OAuth flow that runs in a popup (vault credentials, MCP
 * server sign-in). Kept in one place because the escaping and the explicit
 * origin list are security-critical — a second hand-rolled copy is how a "*"
 * target eventually sneaks in.
 */

function htmlEncode(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export const POPUP_ALLOWED_ORIGINS = (
  process.env.CORS_ORIGINS ||
  "http://localhost:5173,http://localhost:5174,https://blinkbox.net,https://www.blinkbox.net"
)
  .split(",")
  .map((o) => o.trim().replace(/['"]/g, "").replace(/\/$/, ""))
  .filter(Boolean);

/**
 * Renders a small HTML page that sends the result to the opener window via postMessage.
 */
export function renderPopupResult(res, data, messageType = "blinkbox:oauth") {
  // Replace </ to prevent script tag breakout when JSON is embedded in <script>
  const payload = JSON.stringify(data).replace(/<\//g, "<\\/");
  // Encode the human-readable error message for safe HTML embedding
  const safeError = data.error ? htmlEncode(data.error) : "";

  res.setHeader("Content-Type", "text/html");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(`<!DOCTYPE html>
<html>
<head><title>BlinkBox — OAuth</title></head>
<body style="background:#09090b;color:#a1a1aa;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <div style="text-align:center">
    <p style="font-size:14px">${safeError ? "Authorization failed" : "Connected! You can close this window."}</p>
    ${safeError ? `<p style="color:#f87171;font-size:12px;margin-top:8px">${safeError}</p>` : ""}
  </div>
  <script>
    var allowedOrigins = ${JSON.stringify(POPUP_ALLOWED_ORIGINS)};
    var payload = ${payload};
    var messageType = ${JSON.stringify(messageType)};
    if (window.opener) {
      allowedOrigins.forEach(function(origin) {
        try { window.opener.postMessage({ type: messageType, payload: payload }, origin); } catch(e) {}
      });
      setTimeout(function() { window.close(); }, 1500);
    }
  </script>
</body>
</html>`);
}
