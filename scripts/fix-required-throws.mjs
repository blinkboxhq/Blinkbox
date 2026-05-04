import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INTEGRATIONS = path.resolve(__dirname, "../apps/backend/src/nodes/integrations");
const NODES = path.resolve(__dirname, "../apps/backend/src/nodes");

// Match: if (!x) throw new Error("Foo: '...' is required...")
// Replace with soft-fail return
function convertFile(filePath) {
  let src = fs.readFileSync(filePath, "utf8");
  const orig = src;

  // Pattern: throw new Error("... required ...");  — single line
  src = src.replace(
    /throw new Error\(("(?:[^"\\]|\\.)*(?:required|is required)(?:[^"\\]|\\.)*)"(\s*)\);/g,
    (match, msg) => `return { success: false, error: ${msg}, skipped: true };`
  );

  if (src !== orig) {
    fs.writeFileSync(filePath, src, "utf8");
    return true;
  }
  return false;
}

let count = 0;
const dirs = [INTEGRATIONS, NODES];
for (const dir of dirs) {
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".node.js"))) {
    if (convertFile(path.join(dir, f))) {
      count++;
      console.log("✓", f);
    }
  }
}
console.log(`\nDone — ${count} files updated.`);
