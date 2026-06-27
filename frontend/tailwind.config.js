export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#050816',
        panel: '#0b1020',
        card: '#101729',
        line: '#1d2942',
        aqua: '#19d3da',
        mint: '#36f39a',
        danger: '#ff5470',
        amber: '#ffcf5c'
      },
      boxShadow: {
        glow: '0 0 34px rgba(25, 211, 218, 0.12)'
      }
    }
  },
  plugins: []
};
