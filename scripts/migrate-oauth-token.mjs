/**
 * Migrates all integration nodes from the old resolveCredential+decrypt pattern
 * to the new getOAuthToken utility which handles automatic token refresh.
 *
 * Handles two patterns:
 *   1. Nodes with a local `getToken(credentialId, workspaceId)` function
 *   2. Nodes with inline resolveCredential+decrypt calls
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NODES_DIR = path.join(__dirname, "../apps/backend/src/nodes/integrations");
const NEW_IMPORT = `import { getOAuthToken } from "../../utils/getOAuthToken.js";\n`;

let fixed = 0;
let skipped = 0;

const files = fs.readdirSync(NODES_DIR).filter(f => f.endsWith(".node.js"));

for (const file of files) {
  const fullPath = path.join(NODES_DIR, file);
  let src = fs.readFileSync(fullPath, "utf8");
  const original = src;

  if (!src.includes("resolveCredential")) {
    skipped++;
    continue;
  }

  // ── Pattern 1: local getToken function ──────────────────────────────────────
  // Matches:
  //   async function getToken(credentialId, workspaceId) {
  //     const cred = await resolveCredential(credentialId, workspaceId, "Label");
  //     return decrypt(cred.encryptedData, cred.iv, cred.authTag);
  //   }
  const getTokenFnRegex = /async function getToken\(credentialId,\s*workspaceId\)\s*\{[^}]*resolveCredential\([^,]+,\s*workspaceId,\s*["']([^"']+)["']\)[^}]*\}/s;
  const match = src.match(getTokenFnRegex);
  if (match) {
    const label = match[1];
    const newFn = `async function getToken(credentialId, workspaceId) {\n  return getOAuthToken(credentialId, workspaceId, "${label}");\n}`;
    src = src.replace(match[0], newFn);
  }

  // ── Pattern 2: inline resolveCredential + decrypt (no getToken function) ────
  // Matches:
  //   const cred = await resolveCredential(config.credentialId, context.workspaceId, "Label");
  //   const <tokenVar> = decrypt(cred.encryptedData, cred.iv, cred.authTag);
  const inlineRegex = /const cred\s*=\s*await resolveCredential\(([^,]+),\s*([^,]+),\s*["']([^"']+)["']\);\s*\n(\s*)const ([a-zA-Z_]+)\s*=\s*decrypt\(cred\.encryptedData,\s*cred\.iv,\s*cred\.authTag\);/g;
  src = src.replace(inlineRegex, (_, credIdExpr, wsExpr, label, indent, varName) => {
    return `const ${varName} = await getOAuthToken(${credIdExpr.trim()}, ${wsExpr.trim()}, "${label}");`;
  });

  // ── Pattern 3: inline with different variable names ─────────────────────────
  // const cred = await resolveCredential(...); ... token = decrypt(cred.encryptedData, ...)
  // Handle cases where the decrypt is not immediately after resolveCredential
  if (src.includes("resolveCredential") && src.includes('decrypt(cred.encryptedData')) {
    // Try a broader replacement for the remaining resolveCredential calls
    const broadRegex = /const cred\s*=\s*await resolveCredential\(([^,]+),\s*([^,]+),\s*["']([^"']+)["']\);\n/g;
    const decryptRegex = /return decrypt\(cred\.encryptedData,\s*cred\.iv,\s*cred\.authTag\);/g;

    if (src.match(broadRegex) && src.match(decryptRegex)) {
      src = src.replace(broadRegex, (_, credIdExpr, wsExpr, label) => {
        return `const __accessToken = await getOAuthToken(${credIdExpr.trim()}, ${wsExpr.trim()}, "${label}");\n`;
      });
      src = src.replace(/return decrypt\(cred\.encryptedData,\s*cred\.iv,\s*cred\.authTag\);/g, 'return __accessToken;');
      src = src.replace(/decrypt\(cred\.encryptedData,\s*cred\.iv,\s*cred\.authTag\)/g, '__accessToken');
    }
  }

  if (src === original) {
    skipped++;
    continue;
  }

  // ── Add getOAuthToken import ─────────────────────────────────────────────────
  if (!src.includes("getOAuthToken")) {
    // Insert after the last existing import line
    src = src.replace(
      /^(import .+;\n)(?!import)/m,
      (match) => match + NEW_IMPORT
    );
  }

  // ── Remove resolveCredential import if no longer used ────────────────────────
  if (!src.includes("resolveCredential(")) {
    src = src.replace(/import \{ resolveCredential \} from "\.\.\/\.\.\/utils\/resolveCredential\.js";\n/, "");
  }

  // ── Remove decrypt import if no longer used ──────────────────────────────────
  // Only remove if decrypt is not used for anything else (e.g. JSON parsing)
  const decryptUsages = (src.match(/decrypt\(/g) || []).length;
  if (decryptUsages === 0) {
    src = src.replace(/import \{ decrypt \} from "\.\.\/\.\.\/utils\/crypto\.js";\n/, "");
    // Also handle combined imports like: import { encrypt, decrypt } from ...
    src = src.replace(/import \{ encrypt, decrypt \} from "\.\.\/\.\.\/utils\/crypto\.js";/, 'import { encrypt } from "../../utils/crypto.js";');
    src = src.replace(/import \{ decrypt, encrypt \} from "\.\.\/\.\.\/utils\/crypto\.js";/, 'import { encrypt } from "../../utils/crypto.js";');
  }

  fs.writeFileSync(fullPath, src, "utf8");
  console.log(`✓ ${file}`);
  fixed++;
}

console.log(`\nDone: ${fixed} files updated, ${skipped} skipped.`);
