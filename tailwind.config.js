/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        terra:          "#1E8A4C",
        "terra-dark":   "#166B3A",
        "terra-light":  "#E8F5EE",
        deep:           "#FFFFFF",
        "deep-mid":     "#F8FAFB",
        "deep-light":   "#E8F0ED",
        "deep-surface": "#F1F7F4",
        "dark-base":    "#0D1F17",
        "dark-mid":     "#162E1F",
        "dark-light":   "#1E4230",
        "dark-surface": "#243B2C",
        ink:            "#0F1F17",
        "ink-400":      "#374740",
        "ink-500":      "#5A6B62",
        amber:          "#E07B00",
        sky:            "#0D7EA8",
        danger:         "#C0392B",
        success:        "#1E8A4C",
        warning:        "#B8860B",
      },
      fontFamily: { sans: ["Inter", "sans-serif"] },
      boxShadow: {
        card:        "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
        "card-hover":"0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};
