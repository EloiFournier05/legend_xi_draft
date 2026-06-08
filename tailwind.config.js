/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Rajdhani", "Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        pitch: "#0f5e36",
        night: "#070b13",
        panel: "#101723",
        gold: "#d7b66a",
        neon: "#4bf0c3",
      },
    },
  },
  plugins: [],
};
