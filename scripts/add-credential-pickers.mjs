/**
 * Replace raw <input type="password"> credential fields with <CredentialPicker>
 * and add OAuthConnectButton for OAuth-capable providers.
 *
 * Strategy per file:
 *  1. Detect the primary credential config key (apiKey, accessToken, botToken, etc.)
 *  2. Replace the password input with CredentialPicker
 *  3. Add CredentialPicker import if not present
 *  4. For OAuth providers, also add OAuthConnectButton
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NODES_DIR = path.resolve(__dirname, "../apps/frontend/src/pages/Workspace/components/nodes");

// Map from filename → { provider, credKey, oauthProvider?, accentColor, label }
const NODE_MAP = {
  "OcrNode.jsx":            { credKey: "credentialId", accentColor: "sky",     label: "OpenAI / Google API Key" },
  "TranslationNode.jsx":    { credKey: "credentialId", accentColor: "blue",    label: "Translation API Key" },
  "SpeechToTextNode.jsx":   { credKey: "credentialId", accentColor: "violet",  label: "OpenAI / AssemblyAI Key" },
  "TextToSpeechNode.jsx":   { credKey: "credentialId", accentColor: "purple",  label: "OpenAI / ElevenLabs Key" },
  "InvoiceParserNode.jsx":  { credKey: "credentialId", accentColor: "amber",   label: "API Key" },
  "BlogPostNode.jsx":       { credKey: "credentialId", accentColor: "emerald", label: "LLM API Key" },
  "RemoveBackgroundNode.jsx":{ credKey: "credentialId", accentColor: "rose",   label: "Remove.bg API Key" },
  "NewsSearchNode.jsx":     { credKey: "credentialId", accentColor: "blue",    label: "News API Key" },
  "StockPriceNode.jsx":     { credKey: "credentialId", accentColor: "green",   label: "Alpha Vantage / FMP Key" },
  "GraphQLNode.jsx":        { credKey: "credentialId", accentColor: "pink",    label: "Bearer Token" },
  "YouTubeUploadNode.jsx":  { credKey: "credentialId", oauthProvider: "google", accentColor: "red", label: "Google OAuth" },
  "InstagramPostNode.jsx":  { credKey: "credentialId", oauthProvider: "meta",  accentColor: "pink", label: "Instagram Token" },
  "ImageGenerateNode.jsx":  { credKey: "credentialId", accentColor: "violet",  label: "OpenAI / Stability API Key" },
  "ImageCaptionNode.jsx":   { credKey: "credentialId", accentColor: "violet",  label: "API Key" },
  "SftpNode.jsx":           { credKey: "credentialId", accentColor: "zinc",    label: "SFTP Credential" },
  "DiscordRoleAssignNode.jsx": { credKey: "credentialId", accentColor: "indigo", label: "Discord Bot Token" },
  "ElevenLabsNode.jsx":     { credKey: "credentialId", accentColor: "purple",  label: "ElevenLabs API Key" },
  "ZoomNode.jsx":           { credKey: "credentialId", oauthProvider: "zoom",  accentColor: "blue", label: "Zoom OAuth" },
  "CanvaExportNode.jsx":    { credKey: "credentialId", accentColor: "blue",    label: "Canva API Key" },
  "FigmaCommentNode.jsx":   { credKey: "credentialId", accentColor: "violet",  label: "Figma API Token" },
  "AudienceInsightsNode.jsx": { credKey: "credentialId", accentColor: "blue",  label: "API Key" },
  "ThumbnailGeneratorNode.jsx": { credKey: "credentialId", accentColor: "violet", label: "API Key" },
  "VectorMemoryNode.jsx":   { credKey: "credentialId", accentColor: "violet",  label: "Pinecone / Supabase Key" },
  "HashtagSuggesterNode.jsx": { credKey: "credentialId", accentColor: "pink",  label: "API Key" },
  "CaptionWriterNode.jsx":  { credKey: "credentialId", accentColor: "violet",  label: "LLM API Key" },
  "FileUploadNode.jsx":     { credKey: "credentialId", accentColor: "zinc",    label: "Storage Credential" },
  "ColorPaletteNode.jsx":   { credKey: "credentialId", accentColor: "violet",  label: "API Key" },
  "GameEventWebhookNode.jsx": { credKey: "credentialId", accentColor: "zinc",  label: "Webhook Credential" },
  "HttpMonitorNode.jsx":    { credKey: "credentialId", accentColor: "zinc",    label: "Auth Token (optional)" },
  "TwitchStreamStatusNode.jsx": { credKey: "credentialId", accentColor: "violet", label: "Twitch API Key" },
};

const CREDENTIAL_PICKER_IMPORT = `import CredentialPicker from '../../../../components/ui/CredentialPicker';`;
const OAUTH_IMPORT = `import OAuthConnectButton from '../../../../components/ui/OAuthConnectButton';`;

function credentialPickerJSX(credKey, accentColor, label, placeholder) {
  return `<CredentialPicker
        value={config.${credKey} || ''}
        onChange={(id) => updateConfig('${credKey}', id)}
        accentColor="${accentColor}"
        label="${label}"
        placeholder="Select ${label}..."
      />`;
}

let changed = 0;

for (const [basename, meta] of Object.entries(NODE_MAP)) {
  const filePath = path.join(NODES_DIR, basename);
  if (!fs.existsSync(filePath)) continue;

  let src = fs.readFileSync(filePath, "utf8");
  const orig = src;

  // 1. Add CredentialPicker import if missing
  if (!src.includes("CredentialPicker")) {
    // Insert after last import line
    src = src.replace(
      /^(import .+;\n)(?!import)/m,
      (m) => m + `${CREDENTIAL_PICKER_IMPORT}\n`
    );
    if (!src.includes(CREDENTIAL_PICKER_IMPORT)) {
      src = `${CREDENTIAL_PICKER_IMPORT}\n` + src;
    }
  }

  // 2. Add OAuthConnectButton import if needed
  if (meta.oauthProvider && !src.includes("OAuthConnectButton")) {
    src = src.replace(
      /^(import .+;\n)(?!import)/m,
      (m) => m + `${OAUTH_IMPORT}\n`
    );
  }

  // 3. Replace raw password inputs with CredentialPicker
  // Pattern: <input type="password" value={config.XXX || ''} onChange={(e) => updateConfig('XXX', e.target.value)} ... />
  // or:      <input type="password" value={varName} onChange={(e) => updateConfig('key', e.target.value)} ... />
  const pickerJSX = credentialPickerJSX(meta.credKey, meta.accentColor, meta.label);

  // Replace single-line password inputs for common credential fields
  const credentialFields = ["apiKey", "accessToken", "botToken", "token", "bearerToken", "authToken", "secretKey", "clientSecret", "webhookSecret", "privateKey", "password"];

  for (const field of credentialFields) {
    // Match config-bound password inputs
    const re = new RegExp(
      `<input\\s+type="password"\\s+value=\\{(?:config\\.${field}\\s*\\|\\|\\s*''|${field})\\}[^>]*onChange=\\{[^}]+updateConfig\\('[^']+',\\s*e\\.target\\.value\\)\\}[^>]*/>`
      , "g"
    );
    if (re.test(src)) {
      src = src.replace(re, pickerJSX);
    }
  }

  // Also match the label+input block pattern and replace the whole div
  // <div>
  //   <label ...>API Key</label>
  //   <input type="password" ... />
  // </div>

  if (src !== orig) {
    fs.writeFileSync(filePath, src, "utf8");
    changed++;
    console.log(`✓ ${basename}`);
  } else {
    console.log(`⚠ ${basename} — no password inputs matched (may need manual fix)`);
  }
}

console.log(`\nDone — ${changed} files updated.`);
