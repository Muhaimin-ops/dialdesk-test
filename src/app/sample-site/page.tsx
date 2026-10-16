import type { Metadata } from 'next';
import SampleWebsite from './sample-website';

export const metadata: Metadata = {
  title: 'Sample widget integration',
  description: 'A sample business website for testing the DialDesk voice receptionist widget.',
  robots: { index: false, follow: false },
};

export default function SampleSitePage() {
  return <SampleWebsite />;
}
