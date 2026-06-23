import fs from "fs";
import path from "path";

const NODES = "/Users/sukhhamkaler11gmail.com/Documents/blinkbox/apps/backend/src/nodes";

function fixFile(filePath) {
  let src = fs.readFileSync(filePath, "utf8");
  const orig = src;
  // Fix: error: "foo., skipped: true }  →  error: "foo.", skipped: true }
  src = src.replace(
    /error: "([^"]*)\., skipped: true \}/g,
    'error: "$1.", skipped: true }'
  );
  if (src !== orig) {
    fs.writeFileSync(filePath, src, "utf8");
    return true;
  }
  return false;
}

let count = 0;
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!f.endsWith(".js") && !f.endsWith(".ts")) continue;
    if (fixFile(p)) { count++; console.log("✓", f); }
  }
}
walk(NODES);
console.log(`\nFixed ${count} files.`);
