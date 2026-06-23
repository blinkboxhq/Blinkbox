/**
 * Automatically wires nodeId prop through all node config panel files.
 * For each file:
 *   1. Adds nodeId to the main exported function's destructured params
 *   2. Adds nodeId={nodeId} to every SmartVariableInput that lacks it
 *   3. Threads nodeId through inner sub-components that use SmartVariableInput
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NODES_DIR = path.resolve(__dirname, "../apps/frontend/src/pages/Workspace/components/nodes");

const files = fs.readdirSync(NODES_DIR)
  .filter(f => f.endsWith(".jsx"))
  .map(f => path.join(NODES_DIR, f));

let changed = 0;

for (const filePath of files) {
  let src = fs.readFileSync(filePath, "utf8");

  // Skip if no SmartVariableInput usage
  if (!src.includes("SmartVariableInput")) continue;

  // Skip if already fully wired (all SmartVariableInput calls have nodeId)
  const sviCalls = src.match(/<SmartVariableInput\b[^>]*\/>/gs) || [];
  const allWired = sviCalls.every(call => call.includes("nodeId={nodeId}"));
  if (allWired && src.includes("nodeId")) continue;

  let modified = src;

  // 1. Add nodeId to main export default function if missing
  modified = modified.replace(
    /export default function (\w+)\(\{\s*config\s*=\s*\{\}\s*,\s*updateConfig\s*\}\)/g,
    "export default function $1({ config = {}, updateConfig, nodeId })"
  );
  modified = modified.replace(
    /export default function (\w+)\(\{\s*config\s*=\s*\{\}\s*,\s*updateConfig\s*,\s*selected\s*\}\)/g,
    "export default function $1({ config = {}, updateConfig, nodeId })"
  );

  // 2. Add nodeId={nodeId} to SmartVariableInput calls that don't have it
  // Handle both self-closing and multi-line versions
  modified = modified.replace(
    /(<SmartVariableInput\b)((?:[^>]|\n)*?)(\/>)/g,
    (match, open, attrs, close) => {
      if (attrs.includes("nodeId={nodeId}") || attrs.includes("nodeId=")) return match;
      // Insert nodeId before the closing />
      return `${open}${attrs}\n              nodeId={nodeId}${close}`;
    }
  );

  if (modified !== src) {
    fs.writeFileSync(filePath, modified, "utf8");
    changed++;
    console.log(`✓ ${path.basename(filePath)}`);
  }
}

console.log(`\nDone — ${changed} files updated.`);
