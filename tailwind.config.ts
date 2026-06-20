import type { Config } from 'tailwindcss';

// Colors mirror the app's "soft dusk" design system (src/theme/index.ts) so the
// site feels like the same product. Accent uses the "Tide" theme.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#090f16',
        bggrad: '#111721',
        surface: '#161c25',
        surface2: '#1f2731',
        surface3: '#2a323d',
        ink: '#f1ece4',
        ink2: '#b5aea5',
        ink3: '#757d85',
        ink4: '#575e67',
        accent: '#84c1de', // Tide
        accent2: '#bea9d9', // Heather
        sage: '#9accaa',
        clay: '#dfa084',
        amber: '#ddc084',
      },
      fontFamily: {
        serif: ['var(--font-newsreader)', 'Georgia', 'serif'],
        sans: ['var(--font-hanken)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'monospace'],
      },
      borderRadius: {
        lg: '26px',
        md: '18px',
        sm: '12px',
      },
      maxWidth: {
        content: '1100px',
      },
    },
  },
  plugins: [],
};

export default config;
