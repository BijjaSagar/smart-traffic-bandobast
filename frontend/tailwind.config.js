/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#1B2A4A",
        saffron: "#D97706",
        alert: "#DC2626",
      },
    },
  },
  plugins: [],
};
