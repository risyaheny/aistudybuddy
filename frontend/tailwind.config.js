/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        brand: {
          50:  '#fff0f6',
          100: '#ffe0ee',
          200: '#ffc0dd',
          300: '#ff91c1',
          400: '#ff5a9d',
          500: '#f72b7a',
          600: '#e0105e',
          700: '#bc0a4d',
          800: '#9c0d43',
          900: '#82103c',
        }
      },
    },
  },
  plugins: [],
}
