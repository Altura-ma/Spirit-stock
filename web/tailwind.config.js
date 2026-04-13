/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#8B4513', light: '#A0522D' },
        accent: '#D4A017',
        background: '#F7F4F0',
        danger: { DEFAULT: '#E53935', light: '#FFEBEE' },
        success: { DEFAULT: '#2E7D32', light: '#E8F5E9' },
        warning: { DEFAULT: '#F57C00', light: '#FFF3E0' },
      },
    },
  },
  plugins: [],
}
