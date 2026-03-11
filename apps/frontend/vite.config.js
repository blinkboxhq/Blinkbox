import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    headers: {
      // 🛡️ This tells the browser: "Let the Google Auth popup talk to Blinkbox"
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
  },
});
