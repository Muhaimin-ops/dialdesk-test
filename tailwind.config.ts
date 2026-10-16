import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14232F',
        paper: '#F3F5F7',
        mist: '#DDE3E8',
        slate2: '#5B6B79',
        lamp: '#E39B17',
        live: '#1F9D6B',
        alarm: '#C0392B',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
