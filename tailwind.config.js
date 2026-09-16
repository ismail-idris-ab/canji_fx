/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Canji is a committed dark design. Tokens are named by role so a
        // screen never hardcodes a hex value.
        ground: '#0B0B0F',
        surface: '#15151C',
        raised: '#1D1D26',
        line: '#2A2A35',
        ink: '#F5F5F7',
        muted: '#8A8A99',
        faint: '#5A5A68',

        // Amber/gold. Deliberately green-free so Canji does not read as
        // Aboki Forex, and so the Freshness ramp below can sit on the same
        // warm hue family without colliding with the brand colour.
        accent: '#F5B301',
        'accent-dim': '#8A6600',

        // Freshness is a single warm ramp: confident, cautious, unreliable.
        fresh: '#F5B301',
        aging: '#E07B39',
        stale: '#C7443A',
      },
      fontFamily: {
        // Tabular figures matter: rate rows must not jitter as digits change.
        mono: ['monospace'],
      },
    },
  },
  plugins: [],
};
