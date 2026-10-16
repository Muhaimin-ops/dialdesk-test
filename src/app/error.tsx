'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-slate2">Check the server logs, and that all required environment variables are set.</p>
      <button onClick={reset} className="btn-ghost">Try again</button>
    </main>
  );
}
