import subframePreset from "./src/ui/tailwind.config.js";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [subframePreset],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/ui/**/*.{tsx,ts,js,jsx}", // Bileşenlerin burada olduğunu görselden teyit etmiştik
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};