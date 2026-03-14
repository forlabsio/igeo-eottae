import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F3F1EB',
        card: '#FFFFFF',
        'accent-green': '#ADFA1D',
        'text-primary': '#1A1918',
        'text-secondary': '#9B9690',
        border: '#E6E1D8',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Apple SD Gothic Neo', 'Noto Sans KR', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(26,25,24,0.06)',
        'card-hover': '0 4px 12px rgba(26,25,24,0.10)',
      },
    },
  },
  plugins: [],
};
export default config;
