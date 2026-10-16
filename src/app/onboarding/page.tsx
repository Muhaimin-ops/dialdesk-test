import SubmitButton from '@/components/SubmitButton';
import { createBusiness } from '@/app/actions/business';
import { INDUSTRIES } from '@/lib/types';

export const metadata = { title: 'Set up your business' };

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const zones = (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone');
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form action={createBusiness} className="card w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold">Set up your receptionist</h1>
        <p className="text-sm text-slate2">You can change everything later.</p>
        {error && <p role="alert" className="rounded-lg bg-alarm/10 p-2 text-sm text-alarm">{error}</p>}
        <div><label className="label" htmlFor="name">Business name</label><input id="name" name="name" required minLength={2} maxLength={80} className="input" placeholder="Riverside Plumbing" /></div>
        <div>
          <label className="label" htmlFor="industry">Industry</label>
          <select id="industry" name="industry" className="input" defaultValue="general">
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="timezone">Time zone</label>
          <input id="timezone" name="timezone" list="zones" required defaultValue="UTC" className="input" />
          <datalist id="zones">{zones.map((z) => <option key={z} value={z} />)}</datalist>
          <p className="hint">Opening hours and bookings use this zone, e.g. Asia/Dhaka or America/New_York.</p>
        </div>
        <SubmitButton className="btn w-full">Create</SubmitButton>
      </form>
    </main>
  );
}
