/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gacha: {
          dark: '#0f172a',
          card: '#1e293b',
          accent: '#8b5cf6',
          gold: '#ffd700',
        },
      },
    },
  },
  plugins: [],
};
