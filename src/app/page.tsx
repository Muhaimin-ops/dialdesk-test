import Link from 'next/link';

const STEPS = [
  ['Add one line to your site', 'Paste a script tag. A floating “Talk to us” button appears and opens a voice assistant.'],
  ['It answers like your front desk', 'Knows your hours and services, checks real availability and books straight into your calendar.'],
  ['You get the details', 'Appointments, leads and full transcripts land in your dashboard, with email confirmations to customers.'],
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight">Dial<span className="text-lamp">Desk</span></span>
        <nav className="flex gap-2">
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn">Start free</Link>
        </nav>
      </header>

      <section className="py-20 md:py-28">
        <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate2">
          <span className="h-2 w-2 rounded-full bg-live" /> Line open 24/7
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">Never miss the call that books the job.</h1>
        <p className="mt-6 max-w-xl text-lg text-slate2">
          A voice receptionist for local businesses. It answers instantly, books appointments against your hours and captures every lead — while you’re on the tools.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/signup" className="btn px-6 py-3">Create your receptionist</Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {STEPS.map(([title, body], i) => (
          <div key={title} className="card">
            <span className="text-xs font-semibold text-lamp">0{i + 1}</span>
            <h3 className="mt-2 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-slate2">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
