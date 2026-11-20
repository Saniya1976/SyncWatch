/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        surface: '#111827',
        'surface-elevated': '#1F2937',
        border: '#374151',
        primary: {
          DEFAULT: '#EF4444', // YouTube red accent
          hover: '#DC2626',
          subtle: 'rgba(239, 68, 68, 0.15)',
        },
        brand: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
        }
      },
    },
  },
  plugins: [],
}

