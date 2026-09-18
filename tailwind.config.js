/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Aboki Rate is a committed dark design. Tokens are named by role so a
        // screen never hardcodes a hex value.
        ground: '#0B0B0F',
        surface: '#15151C',
        raised: '#1D1D26',
        line: '#2A2A35',
        ink: '#F5F5F7',
        muted: '#8A8A99',
        faint: '#5A5A68',

        // Amber/gold. Deliberately green-free so Aboki Rate does not read as
        // Aboki Forex, and so the Freshness ramp below can sit on the same
        // warm hue family without colliding with the brand colour.
        accent: '#F5B301',
        'accent-dim': '#8A6600',

        // The reading surface. Long-form on near-black is punishing, so an
        // article gets its own ground — pale ledger green-grey rather than
        // the cream every reading view reaches for, taken from the paper
        // this subject actually lives on: accounting stock.
        paper: '#EAEDE8',
        'paper-rule': '#D3D8D1',
        'paper-ink': '#17191A',
        'paper-soft': '#4A4F4D',
        // The brand amber darkened until it is legible on a pale ground.
        'paper-mark': '#8A5A00',

        // Freshness is a single warm ramp: confident, cautious, unreliable.
        fresh: '#F5B301',
        aging: '#E07B39',
        stale: '#C7443A',
      },
      fontFamily: {
        // Tabular figures matter: rate rows must not jitter as digits change.
        mono: ['monospace'],
        // Headlines carry the personality; body is drawn for long measure at
        // small sizes, which is the whole job on a phone.
        display: ['BricolageGrotesque_700Bold'],
        read: ['Newsreader_400Regular'],
        'read-medium': ['Newsreader_500Medium'],
        'read-italic': ['Newsreader_400Regular_Italic'],
      },
    },
  },
  plugins: [],
};
