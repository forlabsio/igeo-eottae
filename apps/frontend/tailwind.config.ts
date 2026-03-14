import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#111110',
        card: '#1C1B19',
        'card-elevated': '#242320',
        'accent-green': '#ADFA1D',
        'text-primary': '#F2F0EB',
        'text-secondary': '#6B6760',
        border: '#2A2926',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Apple SD Gothic Neo', 'Noto Sans KR', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.30)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.50)',
      },
    },
  },
  plugins: [],
};
export default config;
