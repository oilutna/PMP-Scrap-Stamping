/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#070B11', panel: '#101720', panel2: '#17222E', line: '#243241',
        ink: '#EAF2F8', mute: '#8295A7', amber: '#F0A73F', cyan: '#34C3E8',
        coral: '#F2555A', teal: '#34D399', violet: '#9B7EF0',
      },
      fontFamily: { mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'] },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,.025), 0 18px 45px -24px rgba(0,0,0,.9)',
        cyan: '0 0 30px rgba(52,195,232,.13)',
      },
    },
  },
  plugins: [],
};

