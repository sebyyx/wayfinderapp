import type { Metadata } from 'next';
import { Newsreader, Hanken_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

// Same typefaces as the app: Newsreader (serif), Hanken Grotesk (sans),
// IBM Plex Mono (kickers / numbers).
const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
});
const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hanken',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://wayfinderapp.life'),
  title: 'Wayfinder — Find Meaning in Every Step',
  description:
    'Wayfinder turns how you move through the world into a daily constellation and a calm, AI-written reflection. Not astrology — your real path, made meaningful.',
  openGraph: {
    title: 'Wayfinder — Find Meaning in Every Step',
    description:
      'Your day, drawn as a constellation. A calm daily reflection from how you actually moved. Not astrology — a self-awareness companion.',
    url: 'https://wayfinderapp.life',
    siteName: 'Wayfinder',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${hanken.variable} ${plexMono.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
