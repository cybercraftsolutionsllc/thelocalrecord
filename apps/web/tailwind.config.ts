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
        ink: "#14171f",
        moss: "#2f5f7d",
        sand: "#f7f8f5",
        clay: "#b35b3d",
        sky: "#e9f4f8"
      },
      boxShadow: {
        card: "0 18px 50px rgba(20, 23, 31, 0.07)"
      }
    }
  },
  plugins: []
};

export default config;
