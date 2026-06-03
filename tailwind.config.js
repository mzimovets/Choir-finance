const { heroui } = require('@heroui/react')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        page: '#F7F4F1',
        warm: {
          50: '#fdf8f4',
          100: '#f7f0e8',
          200: '#eeddd0',
          300: '#dfc2a8',
          400: '#bd9673',
          500: '#a87d58',
          600: '#9b7653',
          700: '#7d5e42',
          800: '#5c4330',
          900: '#2c1a0e',
        },
      },
      fontFamily: {
        slab: ['"Roboto Slab"', 'Georgia', 'serif'],
      },
    },
  },
  darkMode: 'class',
  plugins: [heroui({
    themes: {
      light: {
        colors: {
          primary: {
            DEFAULT: '#9b7653',
            foreground: '#ffffff',
          },
        },
      },
    },
  })],
}
