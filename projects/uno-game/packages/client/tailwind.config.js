/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        uno: {
          red: '#ED1C24',
          blue: '#0054A6',
          green: '#00A651',
          yellow: '#FFDE00',
          dark: '#1C1917',
          felt: '#0F2F20'
        }
      }
    },
  },
  plugins: [],
}
