import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── Vendor splits ──────────────────────────────────────────────
          if (id.includes("node_modules/react-dom"))       return "v-react-dom";
          if (id.includes("node_modules/react-router"))    return "v-router";
          if (id.includes("node_modules/react"))           return "v-react";
          if (id.includes("node_modules/@xyflow"))         return "v-xyflow";
          if (id.includes("node_modules/framer-motion"))   return "v-framer";
          if (id.includes("node_modules/lucide-react"))    return "v-lucide";
          if (id.includes("node_modules/react-icons"))     return "v-icons";
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3")) return "v-charts";
          if (id.includes("node_modules/socket.io"))       return "v-socket";
          if (id.includes("node_modules/three"))           return "v-three";
          if (id.includes("node_modules/dagre"))           return "v-dagre";
          if (id.includes("node_modules/@radix-ui"))       return "v-radix";
          if (id.includes("node_modules/axios"))           return "v-axios";
          if (id.includes("node_modules/zustand"))         return "v-zustand";
          if (id.includes("node_modules/sonner"))          return "v-sonner";
          if (id.includes("node_modules"))                 return "v-misc";

          // ── Workspace canvas (hot path) ────────────────────────────────
          if (id.includes("/components/nodes/CustomNode")) return "canvas-core";

          // ── Agent cluster ──────────────────────────────────────────────
          if (id.includes("/components/nodes/Agent"))      return "nodes-agent";

          // ── AI / LLM nodes ─────────────────────────────────────────────
          if (/\/nodes\/(AI|Anthropic|OpenAI|Gemini|DeepSeek|ElevenLabs|CodingAgent|BrowserAgent|VectorMemory|Pinecone|OpenAICompat|OpenAIAssistant)/.test(id)) return "nodes-ai";

          // ── Communication ──────────────────────────────────────────────
          if (/\/nodes\/(Slack|Discord|Telegram|WhatsApp|Teams|Zoom|Twilio|Resend|SendGrid|Gmail|Email|Notification|Imapmail|Chat)/.test(id)) return "nodes-comms";

          // ── DevTools / Infra ───────────────────────────────────────────
          if (/\/nodes\/(GitHub|GitLab|Sentry|Vercel|Netlify|Datadog|PagerDuty|Azure|VirusTotal|Docker|Sftp|S3Node|GraphQL|Grpc|Ssh|DNS|SSL|Port|Http|Env|Npm|Semver|Code)/.test(id)) return "nodes-devtools";

          // ── CRM / Project management ───────────────────────────────────
          if (/\/nodes\/(Stripe|Airtable|Hubspot|Shopify|Pipedrive|Intercom|Zendesk|Calendly|Asana|ClickUp|Monday|Trello|WooCommerce|Jira|Linear|Notion|HubSpot)/.test(id)) return "nodes-crm";

          // ── Integrations / Google / Microsoft ─────────────────────────
          if (/\/nodes\/(Google|Outlook|OneDrive|SharePoint|Mailchimp|Typeform|Figma|Canva|Zoom)/.test(id)) return "nodes-integration";

          // ── Social / Content ───────────────────────────────────────────
          if (/\/nodes\/(Twitter|Instagram|TikTok|LinkedIn|Reddit|Mastodon|YouTube|HackerNews|ProductHunt|Rss|Blog|Audience|Caption|Hashtag|Thumbnail|Podcast)/.test(id)) return "nodes-social";

          // ── Triggers ───────────────────────────────────────────────────
          if (/\/nodes\/.*Trigger/.test(id)) return "nodes-triggers";

          // ── Data processing / transform ────────────────────────────────
          if (/\/nodes\/(CSV|JSON|XML|Html|Markdown|TextFormat|NumberFormat|TextSplitter|DataMapper|SetFields|DataDiff|Aggregate|Sort|Filter|Deduplicate|BatchSplit|Merge|Template|Regex|FindReplace|UrlParser|Base64|Hash|Crypto|Zip|QRCode|PDF)/.test(id)) return "nodes-transform";

          // ── Flow control ───────────────────────────────────────────────
          if (/\/nodes\/(Condition|Switch|Loop|Delay|Retry|Stop|Wait|Rate|Approval|Success|LogicRouter|Pagination|Counter|Random|Variable|Webhook)/.test(id)) return "nodes-flow";

          // ── Research / Knowledge ───────────────────────────────────────
          if (/\/nodes\/(PubMed|Arxiv|Wikipedia|Drug|Clinical|Weather|News|Stock|Currency|Ip|Stock|CryptoPr|Steam|Twitch|Discord|Game|Leaderboard)/.test(id)) return "nodes-research";

          // ── Finance / Education ────────────────────────────────────────
          if (/\/nodes\/(Gst|Invoice|Tax|Bank|Ledger|Compound|Payroll|Flashcard|Quiz|Citation|Grammar|Summarize|Translation|Speech|Ocr|Image|Remove|Font|Color|Palette|Fov)/.test(id)) return "nodes-other";

          // ── Database / Storage ─────────────────────────────────────────
          if (/\/nodes\/(Postgres|Mongo|Redis|Firebase|Supabase|File|Sftp|S3)/.test(id)) return "nodes-db";

          // ── Catch-all for remaining node panels ────────────────────────
          if (id.includes("/components/nodes/")) return "nodes-extra";
        },
      },
    },
  },
});
