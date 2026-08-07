import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: "#191c1f",
        charcoal2: "#22262a",
        steel: "#5b6470",
        steelLight: "#9aa3ad",
        paper: "#f3f1ec",
        paper2: "#e8e5dd",
        line: "#dcd8cf",
        brand: { DEFAULT: "#c62828", dark: "#8f1c1c" },
        amber: "#d99a1b",
        green: "#2f7d54",
        blue: "#3564a8",
      },
      fontFamily: {
        display: ["Oswald", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
