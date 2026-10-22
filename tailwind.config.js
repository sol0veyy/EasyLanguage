// Tailwind v3: сканируем классы из исходников расширения.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx,vue,html}"],
  theme: {
    extend: {},
  },
  plugins: [],
}
