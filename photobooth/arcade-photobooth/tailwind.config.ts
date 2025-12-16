import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Mengganti font default 'sans' dengan font Sebooth custom Anda
        sans: ["var(--font-custom)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;