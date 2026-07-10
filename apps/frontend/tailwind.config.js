/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          0: "#101010",
          1: "#181818",
          2: "#242424",
          3: "#2e2e2e",
        },
        accent: {
          DEFAULT: "#4d7cff",
          soft: "rgba(77,124,255,0.14)",
          hot: "#7aa0ff",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "float-slow": "floatSlow 8s ease-in-out infinite",
        "float-slower": "floatSlower 12s ease-in-out infinite",
        "marquee": "marquee 25s linear infinite",
        "reveal": "reveal 0.8s ease-out forwards",
        "reveal-up": "revealUp 0.7s ease-out forwards",
        "reveal-scale": "revealScale 0.6s ease-out forwards",
        "gradient-shift": "gradientShift 8s ease-in-out infinite",
        "pulse-ring": "pulseRing 3s ease-out infinite",
        "grid-flow": "gridFlow 20s linear infinite",
        "text-shimmer": "textShimmer 3s ease-in-out infinite",
        "border-glow": "borderGlow 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px) translateX(0px)" },
          "33%": { transform: "translateY(-15px) translateX(10px)" },
          "66%": { transform: "translateY(10px) translateX(-10px)" },
        },
        floatSlower: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-30px) rotate(5deg)" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        reveal: {
          from: { opacity: "0", transform: "translateY(30px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        revealUp: {
          from: { opacity: "0", transform: "translateY(40px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        revealScale: {
          from: { opacity: "0", transform: "scale(0.9)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        pulseRing: {
          "0%": { transform: "scale(1)", opacity: "0.4" },
          "100%": { transform: "scale(2.5)", opacity: "0" },
        },
        gridFlow: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-50%)" },
        },
        textShimmer: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        borderGlow: {
          "0%, 100%": { borderColor: "rgba(59,130,246,0.15)" },
          "50%": { borderColor: "rgba(59,130,246,0.4)" },
        },
      },
    },
  },
  plugins: [],
};
