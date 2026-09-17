/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Owner theme
        owner: {
          bg: '#F8F7F4',
          surface: '#FFFFFF',
          primary: '#0F766E',
          'primary-hover': '#115E59',
          text: '#1F2937',
          muted: '#6B7280',
          border: '#E5E7EB',
          success: '#16A34A',
          warning: '#D97706',
          danger: '#DC2626',
        },
        // Admin theme
        admin: {
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          primary: '#2563EB',
          'primary-hover': '#1D4ED8',
          sidebar: '#172033',
          text: '#111827',
          muted: '#64748B',
          border: '#E2E8F0',
          success: '#16A34A',
          warning: '#D97706',
          danger: '#DC2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
}
