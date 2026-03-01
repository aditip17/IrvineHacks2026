/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:        '#ffffff',
        surface:   '#f5f7f5',
        surface2:  '#e8f0e9',
        border:    '#c2d4c5',
        accent:    '#11472f',
        accent2:   '#1a6b47',
        accent3:   '#ff6b6b',
        muted:     '#6b8c72',
        quietc:    '#11472f',
        greenc:    '#1a6b47',
        activityc: '#2d9e6b',
        lightc:    '#f0a500',
      },
      fontFamily: {
        syne: ['Comfortaa', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
