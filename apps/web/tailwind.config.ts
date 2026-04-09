import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"]
      },
      colors: {
        ink: "#1f2a2a",
        moss: "#20403a",
        sand: "#f3efe4",
        clay: "#b45d3d",
        sky: "#d8e9ef"
      },
      boxShadow: {
        card: "0 20px 60px rgba(25, 44, 43, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
