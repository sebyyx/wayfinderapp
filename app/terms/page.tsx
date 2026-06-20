import type { Metadata } from 'next';
import DocPage, { Block } from '@/components/DocPage';

export const metadata: Metadata = {
  title: 'Terms of Use — Wayfinder',
  description: 'The terms that govern your use of Wayfinder.',
};

const CONTACT = 'privacy@wayfinderapp.life';

const blocks: Block[] = [
  {
    text:
      'These terms govern your use of Wayfinder. By creating an account you agree to them. ' +
      'If you do not agree, please do not use the app.',
  },
  {
    heading: 'The service',
    text:
      'Wayfinder is a wellness and self-awareness companion. It provides reflective, AI-generated ' +
      'readings based on your movement. It is not medical, psychological, or predictive advice, and ' +
      'should not be relied on as such.',
  },
  {
    heading: 'Your account',
    text:
      'You are responsible for keeping your account secure and for the activity that happens under it. ' +
      'You must be old enough to consent to use the app in your country.',
  },
  {
    heading: 'Subscriptions',
    text:
      'Navigator is a $4.99/month auto-renewing subscription with a 7-day free trial. Voyager is a ' +
      'one-time $149 lifetime purchase. All purchases are processed by Apple under the App Store terms; ' +
      'manage or cancel them in your Apple account settings. Free trials convert to paid unless cancelled ' +
      'before they end.',
  },
  {
    heading: 'Acceptable use',
    text:
      'Do not attempt to disrupt, reverse-engineer, or abuse the service, or use it in violation of any ' +
      'applicable law.',
  },
  {
    heading: 'Changes',
    text:
      'We may update these terms as the app evolves. Material changes will be reflected here with an ' +
      'updated date.',
  },
  {
    heading: 'Contact',
    text: `Questions about these terms? Reach us at ${CONTACT}.`,
  },
];

export default function TermsPage() {
  return <DocPage title="Terms of Use" updated="Last updated: June 2026" blocks={blocks} />;
}
