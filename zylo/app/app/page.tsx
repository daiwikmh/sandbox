import { Landing } from './src/components/landing/Landing';

export const metadata = {
  title: 'Zylo — they buy the answer, never the data',
  description:
    'Encrypted datasets on Midnight, computed by an attested enclave and paid for in shielded tDUST.',
};

export default function LandingPage() {
  return <Landing />;
}
