import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    fs: {
      allow: [".", "../../packages"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@triggers": path.resolve(__dirname, "../../packages/triggers"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // scheduler must be in the same chunk as react — it's react's internal
          // dep and splitting it into a catch-all causes circular chunk errors
          if (id.includes("/scheduler/"))            return "v-react";
          if (id.includes("/react-dom/"))            return "v-react-dom";
          if (id.includes("/react-router/") ||
              id.includes("/react-router-dom/"))     return "v-router";
          if (id.includes("/node_modules/react/"))   return "v-react";

          // Large standalone vendor libs — safe to split because nothing in our
          // app code creates circular deps with them
          if (id.includes("/@xyflow/"))              return "v-xyflow";
          if (id.includes("/framer-motion/"))        return "v-framer";
          if (id.includes("/three/"))                return "v-three";
          if (id.includes("/lucide-react/"))         return "v-lucide";
          if (id.includes("/recharts/") ||
              id.includes("/node_modules/d3"))       return "v-charts";
        },
      },
    },
  },
});
