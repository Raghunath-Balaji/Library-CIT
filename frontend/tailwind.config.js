/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        libraryDark: "#0f172a",
        libraryCard: "#1e293b",
        libraryAccent: "#38bdf8"
      }
    },
  },
  plugins: [],
};
