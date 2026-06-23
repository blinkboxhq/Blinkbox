/**
 * Injects an icon container into node headers that have branding color but no icon.
 *
 * Pattern it finds:
 *   <div className="flex items-center gap-3 p-4 bg-[COLOR]/5 border border-[COLOR]/20 rounded-xl">
 *     <div className="flex flex-col">           ← no icon before this
 *
 * Injects:
 *   <div className="w-8 h-8 rounded-lg bg-[COLOR]/10 border border-[COLOR]/20 flex items-center justify-center shrink-0">
 *     <ICON className="w-4 h-4 text-[COLOR]" />
 *   </div>
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NODES_DIR = path.resolve(__dirname, "../apps/frontend/src/pages/Workspace/components/nodes");

// Map each file basename to the icon name to use
// All icons must already be imported in the file OR we add the import
const ICON_MAP = {
  "StripeNode.jsx":          { icon: "CreditCard",  color: "#635BFF" },
  "PostgresNode.jsx":        { icon: "Database",    color: "#336791" },
  "ShopifyNode.jsx":         { icon: "ShoppingBag", color: "#95BF47" },
  "FirebaseNode.jsx":        { icon: "Flame",       color: "#FFCA28" },
  "ZoomNode.jsx":            { icon: "Video",       color: "#2D8CFF" },
  "ElevenLabsNode.jsx":      { icon: "Mic",         color: "#7C3AED" },
  "TwitterNode.jsx":         { icon: "Twitter",     color: "#1DA1F2" },
  "ResendNode.jsx":          { icon: "Send",        color: "#0F0F0F" },
  "SupabaseNode.jsx":        { icon: "Database",    color: "#3ECF8E" },
  "RedisNode.jsx":           { icon: "Database",    color: "#DC382D" },
  "MongoDBNode.jsx":         { icon: "Database",    color: "#47A248" },
  "PineconeNode.jsx":        { icon: "Cpu",         color: "#005F73" },
  "PDFGeneratorNode.jsx":    { icon: "FileText",    color: "#EF4444" },
  "ImageResizeNode.jsx":     { icon: "Image",       color: "#8B5CF6" },
  "QRCodeNode.jsx":          { icon: "QrCode",      color: "#111827" },
  "TemplateRendererNode.jsx":{ icon: "FileCode",    color: "#F59E0B" },
  "TextSplitterNode.jsx":    { icon: "Scissors",    color: "#06B6D4" },
  "CSVParserNode.jsx":       { icon: "Table",       color: "#10B981" },
  "JSONValidatorNode.jsx":   { icon: "Braces",      color: "#6366F1" },
  "EmailParserNode.jsx":     { icon: "Mail",        color: "#EC4899" },
  "FilterArrayNode.jsx":     { icon: "Filter",      color: "#F97316" },
  "AggregateNode.jsx":       { icon: "BarChart2",   color: "#8B5CF6" },
  "DeduplicateNode.jsx":     { icon: "Copy",        color: "#06B6D4" },
  "SortArrayNode.jsx":       { icon: "ArrowUpDown", color: "#F59E0B" },
  "CryptoUtilsNode.jsx":     { icon: "Lock",        color: "#059669" },
  "DateTimeNode.jsx":        { icon: "Clock",       color: "#6366F1" },
  "MergeNode.jsx":           { icon: "GitMerge",    color: "#8B5CF6" },
  "SwitchNode.jsx":          { icon: "GitBranch",   color: "#F59E0B" },
  "BatchSplitNode.jsx":      { icon: "Layers",      color: "#06B6D4" },
  "DataDiffNode.jsx":        { icon: "Diff",        color: "#F97316" },
  "ApprovalNode.jsx":        { icon: "CheckCircle2",color: "#10B981" },
  "BrowserAgentNode.jsx":    { icon: "Globe",       color: "#6366F1" },
  "VectorMemoryNode.jsx":    { icon: "Cpu",         color: "#7C3AED" },
  "CodingAgentNode.jsx":     { icon: "Code2",       color: "#10B981" },
  "NotificationHubNode.jsx": { icon: "Bell",        color: "#F59E0B" },
  "AIDecisionNode.jsx":      { icon: "Brain",       color: "#6366F1" },
};

// Icons that need to be imported if not present
const LUCIDE_ICONS = new Set([
  "CreditCard","Database","ShoppingBag","Flame","Video","Mic","Twitter","Send",
  "Cpu","FileText","Image","QrCode","FileCode","Scissors","Table","Braces","Mail",
  "Filter","BarChart2","Copy","ArrowUpDown","Lock","Clock","GitMerge","GitBranch",
  "Layers","CheckCircle2","Globe","Brain","Code2","Bell","Diff"
]);

let changed = 0;

for (const [basename, { icon, color }] of Object.entries(ICON_MAP)) {
  const filePath = path.join(NODES_DIR, basename);
  if (!fs.existsSync(filePath)) continue;

  let src = fs.readFileSync(filePath, "utf8");

  // Already has an icon container in header — skip
  if (src.includes("w-8 h-8 rounded-lg") || src.includes("shrink-0")) continue;

  // 1. Ensure icon is imported from lucide-react
  if (LUCIDE_ICONS.has(icon) && !src.includes(icon)) {
    src = src.replace(
      /^(import \{[^}]*\} from ['"]lucide-react['"];?)/m,
      (match) => {
        // Add icon to existing lucide import
        return match.replace(/\}/, `, ${icon} }`);
      }
    );
    // If no lucide import exists, add one
    if (!src.includes("lucide-react")) {
      src = `import { ${icon} } from 'lucide-react';\n` + src;
    }
  }

  // 2. Inject icon container before <div className="flex flex-col">
  // Target the header pattern: flex items-center gap-3 p-4 with color
  const headerRegex = /(<div className="flex items-center gap-3 p-4[^"]*rounded-xl">)\s*\n(\s*)(<div className="flex flex-col">)/;
  if (headerRegex.test(src)) {
    src = src.replace(
      headerRegex,
      (match, headerDiv, indent, flexColDiv) => {
        const iconBlock = `${headerDiv}\n${indent}  <div className="w-8 h-8 rounded-lg bg-[${color}]/10 border border-[${color}]/20 flex items-center justify-center shrink-0">\n${indent}    <${icon} className="w-4 h-4 text-[${color}]" />\n${indent}  </div>\n${indent}${flexColDiv}`;
        return iconBlock;
      }
    );
    fs.writeFileSync(filePath, src, "utf8");
    changed++;
    console.log(`✓ ${basename} → ${icon} (${color})`);
  } else {
    console.log(`⚠ ${basename} — header pattern not matched`);
  }
}

console.log(`\nDone — ${changed} files updated.`);
