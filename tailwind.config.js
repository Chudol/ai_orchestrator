/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#06080f',
          1: '#0d1117',
          2: '#151b27',
          3: '#1c2333',
          4: '#252d3d',
        },
        border: {
          DEFAULT: 'rgba(99, 115, 148, 0.12)',
          subtle: 'rgba(99, 115, 148, 0.08)',
          active: 'rgba(99, 115, 148, 0.25)',
        },
        txt: {
          1: '#e6edf3',
          2: '#8b949e',
          3: '#6e7681',
        },
        accent: {
          blue: '#58a6ff',
          purple: '#bc8cff',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['Menlo', 'Monaco', '"Courier New"', 'monospace'],
      },
    },
  },
  plugins: [],
};
