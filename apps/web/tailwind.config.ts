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
        ink: "#1f2a2a",
        moss: "#20403a",
        sand: "#f7f7f4",
        clay: "#9f5539",
        sky: "#dfecef"
      },
      boxShadow: {
        card: "0 12px 32px rgba(25, 44, 43, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
