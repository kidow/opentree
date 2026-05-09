/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Geist Mono Variable"', '"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        ink: '#0a0a0a',
        charcoal: '#1c1c1e',
        slate: '#3a3a3c',
        steel: '#5a5a5c',
        stone: '#888888',
        muted: '#a8a8aa',
        canvas: '#ffffff',
        'canvas-dark': '#0a0a0a',
        surface: '#f7f7f7',
        'surface-soft': '#fafafa',
        'surface-code': '#1c1c1e',
        hairline: '#e5e5e5',
        'hairline-soft': '#ededed',
        'hairline-dark': '#1f1f1f',
        accent: {
          DEFAULT: '#16a34a',
          deep: '#15803d',
          soft: '#dcfce7',
        },
        'hero-from': '#ecfdf5',
        'hero-to': '#fefce8',
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.03em',
        tight: '-0.02em',
      },
      fontSize: {
        'hero-display': ['clamp(2.75rem, 6vw, 4.5rem)', { lineHeight: '1.05', letterSpacing: '-0.035em', fontWeight: '600' }],
        'display-lg': ['clamp(2.25rem, 5vw, 3.5rem)', { lineHeight: '1.10', letterSpacing: '-0.03em', fontWeight: '600' }],
        'heading-1': ['clamp(2rem, 4vw, 3rem)', { lineHeight: '1.10', letterSpacing: '-0.025em', fontWeight: '600' }],
        'heading-2': ['clamp(1.5rem, 3vw, 2.25rem)', { lineHeight: '1.20', letterSpacing: '-0.02em', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
};
