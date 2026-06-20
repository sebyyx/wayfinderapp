import type { Metadata } from 'next';
import DocPage, { Block } from '@/components/DocPage';

export const metadata: Metadata = {
  title: 'Privacy Policy — Wayfinder',
  description: 'How Wayfinder collects, uses, and protects your data.',
};

const CONTACT = 'privacy@wayfinderapp.life';

const blocks: Block[] = [
  {
    text:
      'Wayfinder is built so that your movement, your reflections, and your story stay yours. ' +
      'This policy explains what we collect, why, and the choices you have.',
  },
  {
    heading: 'What we collect',
    text:
      '• Account: the email address you sign up with.\n' +
      '• Movement: your GPS path, step count, and the places where your day settled.\n' +
      '• Health (optional): heart rate and distance, read from Apple Health only with your explicit ' +
      'permission. This data is read-only — Wayfinder never writes to Health.\n' +
      '• Your words: journal entries and the reflections you choose to write.',
  },
  {
    heading: 'How we use it',
    text:
      'Your data is used only to create your experience: to draw your daily constellation, generate ' +
      'your readings, and build your personal growth timeline. We do not sell your data, and we never ' +
      'use your health or movement data for advertising.',
  },
  {
    heading: 'Where it lives',
    text:
      'Your data is stored securely with our backend provider (Supabase) under row-level security, so ' +
      'only your account can access your own records. Subscriptions are handled by Apple and RevenueCat; ' +
      'we never see or store your payment details.',
  },
  {
    heading: 'AI-generated readings',
    text:
      'To write your daily reading, a short, anonymized summary of your movement for the day is sent to ' +
      'our AI provider (Anthropic). It contains no name, email, or precise location — only a high-level ' +
      'description of the shape of your day.',
  },
  {
    heading: 'Your choices',
    text:
      'You can revoke Health access any time in iOS Settings. You can sign out at any point, and you ' +
      'may request full deletion of your account and data by contacting us.',
  },
  {
    heading: 'Contact',
    text: `Questions about your privacy? Reach us at ${CONTACT}.`,
  },
];

export default function PrivacyPage() {
  return <DocPage title="Privacy Policy" updated="Last updated: June 2026" blocks={blocks} />;
}
