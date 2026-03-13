import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F2F2F0',
        card: '#FFFFFF',
        'accent-green': '#ADFA1D',
        'text-primary': '#1A1A1A',
        'text-secondary': '#737373',
        border: '#E8E8E8',
        danger: '#EF4444',
      },
    },
  },
  plugins: [],
};
export default config;
