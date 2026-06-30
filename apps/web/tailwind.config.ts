import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"]
      },
      colors: {
        ink: "#071114",
        moss: "#2d7ff9",
        sand: "#f4f7fb",
        clay: "#ff7a1a",
        sky: "#d9edff"
      },
      boxShadow: {
        card: "0 24px 80px rgba(0, 0, 0, 0.28)"
      }
    }
  },
  plugins: []
};

export default config;
