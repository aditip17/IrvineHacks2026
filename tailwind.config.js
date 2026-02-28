/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:        '#0b0e14',
        surface:   '#12161f',
        surface2:  '#1a1f2e',
        border:    '#232840',
        accent:    '#4fffb0',
        accent2:   '#7b61ff',
        accent3:   '#ff6b6b',
        muted:     '#5b6278',
        quietc:    '#4fffb0',
        greenc:    '#56cfab',
        activityc: '#7b61ff',
        lightc:    '#ffd166',
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
