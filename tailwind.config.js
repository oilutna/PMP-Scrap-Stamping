/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0B0F14',
        panel: '#121922',
        panel2: '#1A2530',
        line: '#26333F',
        ink: '#E8EDF2',
        mute: '#8496A8',
        amber: '#F0A73F',
        cyan: '#34C3E8',
        coral: '#F2555A',
        teal: '#34D399',
        violet: '#9B7EF0',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 24px -8px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};
