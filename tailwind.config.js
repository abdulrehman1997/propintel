/** @type {import('tailwindcss').Config} */

// ─── Light Editorial Luxury palette ──────────────────────────────────────────
// One deep accent (forest green), tiny brass, desaturated semantic states.
// Existing components reference the slate/blue/indigo/emerald/rose/amber scales,
// so we remap those scales to the new palette rather than rename everything.

const ink = {
  50: '#FAF8F3', // warm paper
  100: '#F3EFE7', // raised paper / inset
  200: '#E7E1D5', // hairline border
  300: '#D6CFC0',
  400: '#9A9385', // muted secondary text
  500: '#736D60',
  600: '#544F45',
  700: '#3A362F',
  800: '#26231E',
  900: '#1A1A1A', // ink near-black
};

const forest = {
  50: '#EEF2EF',
  100: '#DCE4DE',
  200: '#B9C8BF',
  300: '#8EA89A',
  400: '#577867',
  500: '#335745',
  600: '#274539',
  700: '#1F3D32', // brand forest green
  800: '#1A332A',
  900: '#142720',
};

const brass = {
  300: '#D4BA94',
  400: '#C2A276',
  500: '#B08D57', // brass / gold accent
  600: '#977749',
};

// Desaturated semantic states
const good = {
  50: '#EDF3EE',
  100: '#DBE7DD',
  200: '#BBD0BF',
  500: '#4F7A5C', // muted green
  600: '#436B4F',
  700: '#37583F',
  800: '#2C4733',
};
const caution = {
  50: '#F6F0E3',
  100: '#EFE4CC',
  200: '#E2CFA6',
  500: '#A9842F', // muted amber
  600: '#8F6F27',
  700: '#73591F',
  800: '#5C4719',
};
const negative = {
  50: '#F4EAE6',
  100: '#EBD7D0',
  200: '#DBB7AB',
  500: '#A85C45', // muted clay red
  600: '#8F4C38',
  700: '#723D2D',
  800: '#5C3124',
};

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Map legacy scales onto the editorial-luxury palette.
        slate: ink,
        gray: ink,
        blue: forest,
        indigo: forest,
        emerald: good,
        green: good,
        amber: caution,
        yellow: caution,
        rose: negative,
        red: negative,
        orange: negative,
        // Named tokens for new code.
        paper: ink,
        ink,
        forest,
        brass,
      },
      borderRadius: {
        '4xl': '1.75rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(26,26,26,0.03), 0 8px 24px -12px rgba(26,26,26,0.10)',
        'soft-lg': '0 2px 4px rgba(26,26,26,0.04), 0 24px 48px -20px rgba(26,26,26,0.14)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.7)',
      },
      transitionTimingFunction: {
        luxe: 'cubic-bezier(0.32,0.72,0,1)',
      },
    },
  },
  plugins: [],
};
