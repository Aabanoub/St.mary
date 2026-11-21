import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brown: {
          50: "#fbf8f5",
          100: "#f5eee7",
          200: "#ebdcd0",
          300: "#dbc2ad",
          400: "#be9877",
          500: "#9f734d",
          600: "#825739",
          700: "#68432b",
          800: "#4f3220",
          900: "#3b2416",
          950: "#22140c",
        },
        bronze: {
          50: "#faf6f1",
          100: "#f2e8dc",
          200: "#e4d0b8",
          300: "#d4b490",
          400: "#c19468",
          500: "#aa7847",
          600: "#8e5f36",
          700: "#724a2c",
          800: "#5a3b25",
          900: "#462e1e",
        },
        gold: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        },
      },
      fontFamily: {
        cairo: ["var(--font-cairo)", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      boxShadow: {
        warm: "0 4px 20px -2px rgba(104, 67, 43, 0.08), 0 2px 6px -1px rgba(104, 67, 43, 0.05)",
        "warm-lg": "0 10px 25px -3px rgba(104, 67, 43, 0.12), 0 4px 10px -2px rgba(104, 67, 43, 0.07)",
        "warm-xl": "0 20px 30px -4px rgba(104, 67, 43, 0.16), 0 8px 12px -3px rgba(104, 67, 43, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
