import type { Metadata } from 'next';
import DocPage, { Block } from '@/components/DocPage';

export const metadata: Metadata = {
  title: 'About — Wayfinder',
  description: 'What Wayfinder is and how it works.',
};

const blocks: Block[] = [
  { text: 'Wayfinder turns how you move through the world into a quiet moment of reflection.' },
  {
    text:
      'Each day it reads your real movement — your path, your pace, and the places your hours ' +
      'settled — and draws it as a personal constellation. It pairs that with a calm, grounded ' +
      'daily reading and remembers it as part of a longer story of who you are becoming.',
  },
  {
    heading: 'Not prediction. A mirror.',
    text:
      'Wayfinder is not a horoscope and makes no claims about the future. It is a wellness and ' +
      'self-awareness companion — a calm way to notice your patterns, reflect, and watch yourself grow over time.',
  },
  {
    heading: 'How it works',
    text:
      'Free every day: your constellation, a full three-layer reading, and your journal. ' +
      'Navigator and Voyager unlock the longitudinal story — weekly reviews, your monthly identity ' +
      'report, identity evolution, full history, and shareable growth cards.',
  },
  { heading: 'Find meaning in every step.', text: 'Wayfinder · version 1.0.0' },
];

export default function AboutPage() {
  return <DocPage title="About Wayfinder" blocks={blocks} />;
}
