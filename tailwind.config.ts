import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#1F2229",
        primary: "#2C303A",
        secondary: "#5F6B84",
        accent: "#B7C0D8",
        "accent-dark": "#5F6B84",
        text: "#E0E0E0",
        "text-secondary": "#A0A0A0",
      },
    },
  },
  plugins: [],
};

export default config;
