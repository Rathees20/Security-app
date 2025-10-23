/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#A20E13',
          light: '#F2EDEE',
        },
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.06)'
      }
    },
  },
  plugins: [],
}


