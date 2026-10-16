import Link from 'next/link';
import SubmitButton from '@/components/SubmitButton';
import { signup } from '@/app/actions/auth';

export const metadata = { title: 'Create your account' };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; next?: string }> }) {
  const { error, notice, next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form action={signup} className="card w-full max-w-sm space-y-4">
        <Link href="/" className="text-lg font-bold tracking-tight">Dial<span className="text-lamp">Desk</span></Link>
        <h1 className="text-xl font-semibold">Create your account</h1>
        {error && <p role="alert" className="rounded-lg bg-alarm/10 p-2 text-sm text-alarm">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-live/10 p-2 text-sm text-live">{notice}</p>}
        {next && <input type="hidden" name="next" value={next} />}
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="input" /></div>
        <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" /></div>
        <SubmitButton className="btn w-full">Create your account</SubmitButton>
        <p className="text-center text-sm text-slate2"><Link href="/login" className="underline">Already have one? Sign in</Link></p>
      </form>
    </main>
  );
}
